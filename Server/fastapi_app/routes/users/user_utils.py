import json
import logging
import random
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Set, cast
from fastapi import Request, HTTPException, Depends, status
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, load_only

from ...database.database import get_session
from ...database.dbmodels import UserActivity, TestInstance, Test, Question, Answer, User, Result, GradingScheme
from ...utils.helpers import generate_id, build_question_structure
from ... import schemas


async def check_user_participation(db: AsyncSession, user_id: str, instance_id: str):
    stmt = (
        select(UserActivity.is_finished)
        .where(
            UserActivity.user_id == user_id,
            UserActivity.instance_id == instance_id,
        )
        .limit(1)
    )

    result = await db.execute(stmt)
    is_finished = result.scalar_one_or_none()

    if is_finished is None:
        return "no_record"
    elif not is_finished:
        return "resume_test"
    else:
        return "test_finished"


async def user_new_instance_activity(
        request: Request,
        db: AsyncSession,
        user_id: str,
        ulid_id: str,
        dynamic_config: schemas.AppConfigFull
) -> schemas.TestStartResponse:
    name = request.session.get('name')
    surname = request.session.get('surname')
    index = request.session.get('index') if dynamic_config.use_index else None

    activity_id = generate_id()
    request.session["activity_id"] = activity_id

    full_test_data = await get_questions(db, ulid_id)
    if not full_test_data:
        raise HTTPException(status_code=404, detail=f"Instance data not found for id: {ulid_id}")

    all_questions = full_test_data.questions
    num_questions_to_draw = full_test_data.num_questions

    if len(all_questions) > num_questions_to_draw:
        questions_for_user = random.sample(all_questions, num_questions_to_draw)
    else:
        questions_for_user = list(all_questions)

    random.shuffle(questions_for_user)

    for q in questions_for_user:
        random.shuffle(q.answers)

    actual_max_score = sum(q.points_value for q in questions_for_user)

    ua = UserActivity(
        activity_id=activity_id,
        user_id=user_id,
        user_name=name,
        user_surname=surname,
        user_index=index,
        instance_id=ulid_id,
        max_score=int(actual_max_score),
    )
    db.add(ua)

    await save_test_skeleton(db, activity_id, questions_for_user)

    response_data = {
        "test_name": full_test_data.test_name,
        "test_description": full_test_data.test_description,
        "test_time": full_test_data.test_time,
        "instance_name": full_test_data.instance_name,
        "max_score_for_activity": actual_max_score,
        "questions": questions_for_user,
        "user_activity_id": activity_id
    }

    return schemas.TestStartResponse.model_validate(response_data)


async def block_test(request: Request, db: AsyncSession, user_id: str,
                     ulid_id: str) -> schemas.RedirectToResultsResponse:
    stmt = (
        select(UserActivity.activity_id)
        .where(
            UserActivity.user_id == user_id,
            UserActivity.instance_id == ulid_id,
            UserActivity.is_finished.is_(True),
        )
        .limit(1)
    )
    res = await db.execute(stmt)
    activity_id = res.scalar_one_or_none()

    if activity_id:
        request.session['activity_id'] = activity_id
        return schemas.RedirectToResultsResponse(
            message="Test is already finished. Redirecting to results.",
            redirectToResults=True
        )
    else:
        raise HTTPException(status_code=404, detail="Finished test activity not found.")


async def resume_test(request: Request, db: AsyncSession, user_id: str,
                      ulid_id: str) -> schemas.TestStartResponse:
    """
    Wznawia istniejący, niedokończony test, korzystając z pytań zapisanych w sesji.
    """

    stmt = (
        select(UserActivity)
        .options(selectinload(UserActivity.test_instance))
        .where(
            UserActivity.user_id == user_id,
            UserActivity.instance_id == ulid_id,
            UserActivity.is_finished.is_(False),
        )
        .limit(1)
    )
    res = await db.execute(stmt)
    activity = res.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="No active test session found to resume.")

    activity_id = activity.activity_id
    request.session["activity_id"] = activity_id
    current_test_data = await load_test_skeleton(db, activity_id)

    started_at = activity.timestamp
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    elapsed_seconds = int((now - started_at).total_seconds())
    configured_minutes = activity.test_instance.test_time if activity.test_instance else current_test_data.get("test_time", 0)
    total_seconds = max(int(configured_minutes * 60), 0)
    remaining_seconds = max(total_seconds - elapsed_seconds, 0)

    answered_stmt = select(Result.question_id).where(Result.user_activity_id == activity_id)
    answered_q_ids = set(await db.scalars(answered_stmt))

    all_questions_in_session = current_test_data.get("questions", [])
    unanswered_questions = [q for q in all_questions_in_session if q.get('question_id') not in answered_q_ids]

    resume_data = {
        **current_test_data,
        "questions": unanswered_questions,
        "user_activity_id": activity_id,
        "remaining_time_seconds": remaining_seconds,
    }

    return schemas.TestStartResponse.model_validate(resume_data)


async def get_questions(db: AsyncSession, instance_id: str) -> Optional[schemas.TestDataInternal]:
    """
    Asynchronicznie pobiera pulę pytań dla danej instancji testu.
    """

    stmt = (
        select(TestInstance)
        .options(
            selectinload(TestInstance.test)
            .selectinload(Test.questions)
            .selectinload(Question.answers)
        )
        .where(TestInstance.instance_id == instance_id)
        .limit(1)
    )
    instance = (await db.execute(stmt)).scalar_one_or_none()
    if not instance or not instance.test:
        return None

    test = instance.test
    active_questions = [q for q in test.questions if q.is_active]

    if instance.use_fixed_question_pool and instance.fixed_question_ids:
        fixed_ids = cast(List[str], instance.fixed_question_ids)
        questions_map = {q.question_id: q for q in active_questions}
        questions = [questions_map[qid] for qid in fixed_ids if qid in questions_map]
    else:
        questions = active_questions

    if not questions:
        return None

    questions_payload = build_question_structure(questions, include_admin_fields=False)

    response_data = {
        "test_name": test.name,
        "test_description": test.description,
        "test_time": instance.test_time,
        "instance_name": instance.instance_name,
        "num_questions": instance.num_questions,
        "questions": questions_payload,
    }

    return schemas.TestDataInternal.model_validate(response_data)


async def calculate_points(db: AsyncSession, answer_data: schemas.UserAnswerPayload) -> float:
    """Asynchronicznie oblicza punkty dla pojedynczej odpowiedzi użytkownika."""

    test_instance_id = answer_data.test_instance_id
    question_id = answer_data.question_id
    question_type = answer_data.question_type
    user_response = answer_data.user_response or []

    allow_negative_points = False
    score = 0.0

    try:
        ti_stmt = select(TestInstance.scheme_id).where(TestInstance.instance_id == test_instance_id).limit(1)
        scheme_id = (await db.execute(ti_stmt)).scalar_one_or_none()
        if not scheme_id:
            return 0.0

        gs_stmt = select(GradingScheme).where(GradingScheme.scheme_id == scheme_id).limit(1)
        scheme = (await db.execute(gs_stmt)).scalar_one_or_none()
        if not scheme:
            return 0.0

        partial_credit = bool(scheme.partial_credit)
        penalize_wrong = bool(scheme.penalize_wrong)
        penalty_per_wrong = float(scheme.penalty_per_wrong or 0)
        allow_negative_points = bool(scheme.allow_negative_points)

        q_stmt = select(Question.points_value, Question.extra_data).where(Question.question_id == question_id).limit(1)
        q_row = (await db.execute(q_stmt)).one_or_none()
        if not q_row:
            return 0.0

        points_value = float(q_row[0] or 1)
        extra_data: Dict[str, Any] = q_row[1] or {}

        if question_type == 'SingleChoice':
            if not user_response:
                score = -penalty_per_wrong if penalize_wrong else 0.0
            else:
                user_answer_id = user_response[0].get("answer_id")
                if not user_answer_id:
                    score = -penalty_per_wrong if penalize_wrong else 0.0
                else:
                    cnt_stmt = select(func.count()).select_from(Answer).where(
                        Answer.answer_id == user_answer_id,
                        Answer.is_correct.is_(True),
                        Answer.is_active.is_(True)
                    )
                    is_correct = (await db.execute(cnt_stmt)).scalar_one() > 0

                    score = points_value if is_correct else 0.0
                    if penalize_wrong and not is_correct:
                        score -= penalty_per_wrong


        elif question_type in ('MultipleChoice', 'TrueFalse'):

            ans_stmt = select(Answer.answer_id, Answer.is_correct).where(
                Answer.question_id == question_id,
                Answer.is_active.is_(True)
            )
            all_answers = list((await db.execute(ans_stmt)).all())
            if not all_answers:
                return 0.0

            user_choices = {item['answer_id']: item['user_answer'] == 'True' for item in user_response}

            correctly_marked = 0
            wrongly_marked = 0

            for answer_id, correct in all_answers:
                is_actually_correct = bool(correct)
                was_selected_by_user = bool(user_choices.get(answer_id, False))

                if is_actually_correct == was_selected_by_user:
                    correctly_marked += 1
                else:
                    wrongly_marked += 1

            if partial_credit:
                score = (correctly_marked / len(all_answers)) * points_value
            else:
                score = points_value if wrongly_marked == 0 else 0.0

            if penalize_wrong:
                score -= wrongly_marked * penalty_per_wrong


        elif question_type == 'DragAndDropOrder':

            correct_order: List[str] = (extra_data or {}).get("correct_order", []) or []
            if not correct_order:
                return 0.0

            user_order = [item.get('answer_id') for item in user_response]
            total_items = len(correct_order)

            correct_positions = sum(
                1 for i, item_id in enumerate(user_order) if i < total_items and item_id == correct_order[i])

            if partial_credit:
                score = (correct_positions / total_items) * points_value
            else:
                score = points_value if correct_positions == total_items else 0.0

            if penalize_wrong:
                score -= (total_items - correct_positions) * penalty_per_wrong

        elif question_type == 'MatchingMultiple':

            ans_stmt = select(Answer.answer_id, Answer.match_id).where(
                Answer.question_id == question_id,
                Answer.is_active.is_(True)
            )
            all_answers = list((await db.execute(ans_stmt)).all())
            if not all_answers:
                return 0.0

            answer_to_match_map = {a_id: m_id for a_id, m_id in all_answers if m_id is not None}
            user_response_obj = user_response[0] if user_response else {}
            user_left_order = user_response_obj.get('left_order', []) or []
            user_right_order = user_response_obj.get('right_order', []) or []

            if len(user_left_order) != len(user_right_order):
                total_possible_pairs = max(len(all_answers) // 2, 0)
                score = 0.0
                if penalize_wrong:
                    score -= total_possible_pairs * penalty_per_wrong
                if not allow_negative_points:
                    score = max(0.0, score)
                return round(score, 2)

            correct_matches = sum(
                1 for i in range(len(user_left_order))
                if answer_to_match_map.get(user_left_order[i]) is not None
                and answer_to_match_map.get(user_left_order[i]) == answer_to_match_map.get(user_right_order[i]))

            has_correct_order = bool((extra_data or {}).get("hasCorrectOrder"))
            if has_correct_order:
                correct_order_match_ids = extra_data.get('correct_order', [])
                total_items = len(correct_order_match_ids)

                correct_positions = 0
                for i in range(min(len(user_left_order), len(correct_order_match_ids))):
                    left_m = answer_to_match_map.get(user_left_order[i])
                    right_m = answer_to_match_map.get(user_right_order[i])
                    if left_m is not None and left_m == right_m and left_m == correct_order_match_ids[i]:
                        correct_positions += 1

                if partial_credit:
                    score = (correct_positions / (total_items or 1)) * points_value
                else:
                    score = points_value if correct_positions == total_items and total_items > 0 else 0.0

                if penalize_wrong:
                    score -= (max(total_items - correct_positions, 0)) * penalty_per_wrong
            else:
                total_possible_pairs = max(len(all_answers) // 2, 0)
                if partial_credit:
                    score = (correct_matches / (total_possible_pairs or 1)) * points_value
                else:
                    score = points_value if 0 < total_possible_pairs == correct_matches else 0.0

                if penalize_wrong:
                    score -= (total_possible_pairs - correct_matches) * penalty_per_wrong

        elif question_type == 'FillInTheBlank':
            # Źródło prawdy: parts = [text|blank(correct_answer_id), ...]
            parts = extra_data if isinstance(extra_data, list) else (extra_data or [])
            if not isinstance(parts, list):
                return 0.0

            # pomocnicze: najbliższy text w prawo/lewo w PRAWDZIE (ignorujemy blanki)
            def nearest_truth_text(parts, start_idx, step):
                j = start_idx + step
                while 0 <= j < len(parts):
                    p = parts[j]
                    if isinstance(p, dict) and p.get('type') == 'text':
                        return j, (p.get('value') or '').strip()
                    j += step

                return None, None

            # zbuduj listę „blanków” z kontekstem
            blanks = []

            for i, p in enumerate(parts):
                if not (isinstance(p, dict) and p.get('type') == 'blank'):
                    continue

                left_idx, left_text = nearest_truth_text(parts, i, -1)
                right_idx, right_text = nearest_truth_text(parts, i, +1)

                blanks.append({
                    "idx": i,
                    "correct_id": p.get("correct_answer_id"),
                    "left_text": left_text,  # może być None (początek)
                    "right_text": right_text,  # może być None (koniec)

                })

            total_blanks = len(blanks)
            if total_blanks == 0:
                return 0.0

            # User response: sekwencja [text|answer, ...]
            user_parts = user_response if isinstance(user_response, list) else []

            # indeksy odpowiedzi w sekwencji usera (pozycja + id)
            answer_positions = []

            for idx, it in enumerate(user_parts):
                if isinstance(it, dict) and it.get('type') in ('answer', 'blank'):
                    ans_id = it.get('answer_id') or it.get('id')
                    if ans_id:
                        answer_positions.append((idx, ans_id))

            # najbliższy text w lewo/prawo w ODPOWIEDZI usera
            def nearest_user_text(seq, i, step):
                j = i + step
                while 0 <= j < len(seq):
                    it = seq[j]
                    if isinstance(it, dict) and it.get('type') == 'text':
                        return (j, (it.get('value') or '').strip())
                    j += step
                return (None, None)

            used_answer_pos = set()  # by nie użyć tej samej instancji odpowiedzi kilka razy
            correct_count = 0
            wrong_count = 0

            for b in blanks:
                corr_id = b["correct_id"]
                lt = (b["left_text"] or None)
                rt = (b["right_text"] or None)
                matched = False

                for pos_idx, (u_idx, ans_id) in enumerate(answer_positions):
                    if pos_idx in used_answer_pos:
                        continue

                    if ans_id != corr_id:
                        continue

                    _, l_user = nearest_user_text(user_parts, u_idx, -1)
                    _, r_user = nearest_user_text(user_parts, u_idx, +1)

                    left_ok = (lt is None) or (l_user == lt)
                    right_ok = (rt is None) or (r_user == rt)

                    if left_ok and right_ok:
                        matched = True
                        used_answer_pos.add(pos_idx)
                        break

                if matched:
                    correct_count += 1
                else:
                    wrong_count += 1

            # punktacja

            if partial_credit:
                score = (correct_count / total_blanks) * points_value
            else:
                score = points_value if (correct_count == total_blanks and wrong_count == 0) else 0.0

            if penalize_wrong:
                score -= wrong_count * penalty_per_wrong

            logging.info(
                f"FIB q={question_id} correct_seq={parts} user_seq={user_parts} "
                f"partial={partial_credit} penalize={penalize_wrong}"
            )

        elif question_type == 'Rating':

            extra_data = extra_data or {}
            if not extra_data.get("correct_enabled"):
                return 0.0
            if not user_response:
                score = -penalty_per_wrong if penalize_wrong else 0.0
            else:
                is_correct = False
                if extra_data.get('use_range'):
                    user_value = (user_response[0] or {}).get("selected_range")
                    correct_range = extra_data.get('correct_range')

                    if (
                            user_value
                            and correct_range
                            and user_value[0] >= correct_range[0]
                            and user_value[1] <= correct_range[1]
                    ):
                        is_correct = True
                else:
                    user_value = (user_response[0] or {}).get("chosen_value")
                    correct_value = extra_data.get('correct_value')
                    if user_value is not None and user_value == correct_value:
                        is_correct = True

                score = points_value if is_correct else 0.0
                if penalize_wrong and not is_correct:
                    score -= penalty_per_wrong

    except Exception as e:
        logging.error(f"Błąd przetwarzania pytania {question_id} (typ: {question_type}): {e}")
        score = 0.0

    if not allow_negative_points:
        score = max(0.0, score)

    return round(score, 2)


async def save_result(
        db: AsyncSession,
        result_id: str,
        answer_data: schemas.UserAnswerPayload,
        test_id: str,
        activity_id: str,
        points_collected: float
):
    """Asynchronicznie zapisuje pojedynczy wynik do bazy danych."""
    existing_result_stmt = select(Result).where(
        Result.user_activity_id == activity_id,
        Result.question_id == answer_data.question_id
    ).limit(1)
    existing_result = (await db.execute(existing_result_stmt)).scalar_one_or_none()

    normalized_points = round(float(points_collected), 2)
    normalized_response = answer_data.user_response or []

    if existing_result:
        existing_result.user_response = normalized_response
        existing_result.points_collected = normalized_points
    else:
        db.add(
            Result(
                result_id=result_id,
                test_instance_id=answer_data.test_instance_id,
                test_id=test_id,
                question_id=answer_data.question_id,
                user_activity_id=activity_id,
                user_response=normalized_response,
                points_collected=normalized_points,
            )
        )


async def update_user_activity(
        db: AsyncSession,
        activity_id: str
):
    """Asynchronicznie aktualizuje wynik i numer pytania dla danej aktywności."""
    result = await db.execute(
        select(UserActivity).where(UserActivity.activity_id == activity_id)
    )
    ua = result.scalar_one_or_none()

    if not ua:
        return

    score_stmt = select(
        func.coalesce(func.sum(Result.points_collected), 0.0),
        func.count(Result.result_id)
    ).where(Result.user_activity_id == activity_id)
    score_sum, answers_count = (await db.execute(score_stmt)).one()

    ua.score = float(score_sum or 0.0)
    ua.question_number = int(answers_count or 0)


async def save_test_skeleton(
        db: AsyncSession,
        activity_id: str,
        questions_for_user: List[schemas.QuestionUser]
):
    """
    Asynchronicznie tworzy "szkielet" testu (kolejność ID pytań i odpowiedzi)
    i zapisuje go w tabeli UserActivity.
    """

    question_skeleton = {
        "question_order": [q.question_id for q in questions_for_user],
        "answer_orders": {
            q.question_id: [a.answer_id for a in q.answers]
            for q in questions_for_user
        },
    }

    stmt = (
        update(UserActivity)
        .where(UserActivity.activity_id == activity_id)
        .values(questions_data=question_skeleton)
    )
    await db.execute(stmt)
    await db.commit()

    print(f"Pomyślnie zapisano szkielet dla activity_id: {activity_id}")


async def load_test_skeleton(db: AsyncSession, activity_id: str) -> Dict[str, Any]:
    """
    Asynchronicznie odtwarza pełną strukturę testu użytkownika na podstawie
    zapisanego w bazie "szkieletu".
    """
    meta_stmt = (
        select(
            UserActivity.questions_data.label("questions_data"),
            UserActivity.max_score.label("max_score"),
            TestInstance.instance_id.label("instance_id"),
            TestInstance.test_id.label("test_id"),
            TestInstance.instance_name.label("instance_name"),
            TestInstance.test_time.label("test_time"),
            Test.name.label("test_name"),
            Test.description.label("test_description"),
        )
        .join(TestInstance, TestInstance.instance_id == UserActivity.instance_id)
        .join(Test, Test.test_id == TestInstance.test_id)
        .where(UserActivity.activity_id == activity_id)
        .limit(1)
    )
    meta_res = await db.execute(meta_stmt)
    meta = meta_res.mappings().first()

    if not meta or not meta["questions_data"]:
        raise HTTPException(status_code=404, detail="Activity data for test skeleton not found.")

    skeleton = meta.get("questions_data") or {}
    if isinstance(skeleton, str):
        try:
            skeleton = json.loads(skeleton)
        except json.JSONDecodeError:
            skeleton = {}
    elif not isinstance(skeleton, dict):
        skeleton = {}

    question_order_ids = skeleton.get("question_order") or []
    answer_orders_map = skeleton.get("answer_orders") or {}

    def _pack(questions: List[Dict[str, Any]]):
        return {
            "instance_id": meta["instance_id"],
            "test_id": meta["test_id"],
            "test_name": meta["test_name"],
            "test_description": meta["test_description"],
            "test_time": meta["test_time"],
            "instance_name": meta["instance_name"],
            "max_score_for_activity": meta["max_score"],
            "questions": questions,
        }

    if not question_order_ids:
        return _pack([])

    qa_stmt = (
        select(
            Question.question_id,
            Question.question_text,
            Question.question_type,
            Question.points_value,
            Question.image_path,
            Question.extra_data,
            Answer.answer_id,
            Answer.answer_text,
            Answer.is_correct,
            Answer.match_id,
            Answer.side,
        )
        .join(Answer, Answer.question_id == Question.question_id, isouter=True)
        .where(Question.question_id.in_(question_order_ids))
    )
    rows = (await db.execute(qa_stmt)).mappings().all()

    base_structured_questions = build_question_structure(rows, include_admin_fields=False)
    questions_map = {q['question_id']: q for q in base_structured_questions}

    final_questions = []
    for q_id in question_order_ids:
        question = questions_map.get(q_id)
        if not question:
            continue

        desired_order = answer_orders_map.get(q_id) or []
        if desired_order and question.get("answers"):
            answers_map = {a['answer_id']: a for a in question['answers']}
            ordered_answers = [
                answers_map[aid]
                for aid in desired_order
                if aid in answers_map
            ]
            question["answers"] = ordered_answers
        else:
            pass

        final_questions.append(question)

    return _pack(final_questions)


async def fill_missing_results(db: AsyncSession, activity_id: str) -> int:
    """
    Uzupełnia brakujące wiersze w Results dla pytań z zapisanej sesji (skeleton).
    Zwraca liczbę wstawionych rekordów.
    """

    res = await db.execute(
        select(UserActivity, TestInstance)
        .join(TestInstance, TestInstance.instance_id == UserActivity.instance_id)
        .where(UserActivity.activity_id == activity_id)
        .limit(1)
    )
    row = res.first()
    if not row:
        return 0

    ua: UserActivity = row[0]
    ti: TestInstance = row[1]

    if not ua.questions_data:
        return 0

    skeleton = ua.questions_data
    if not isinstance(skeleton, dict):
        return 0

    question_order: List[str] = skeleton.get("question_order", [])
    if not question_order:
        return 0

    res2 = await db.execute(
        select(Result.question_id).where(Result.user_activity_id == activity_id)
    )
    already_answered: Set[str] = {qid for (qid,) in res2.all()}

    missing_qids = [qid for qid in question_order if qid not in already_answered]
    if not missing_qids:
        return 0

    new_results = [
        Result(
            result_id=generate_id(),
            test_instance_id=ti.instance_id,
            test_id=ti.test_id,
            question_id=qid,
            user_activity_id=ua.activity_id,
            user_response=[],
            points_collected=0.0,
        )
        for qid in missing_qids
    ]

    db.add_all(new_results)
    await db.flush()

    return len(new_results)


async def get_formatted_results(db: AsyncSession, activity_id: str) -> List[Dict[str, Any]]:
    """
    Asynchronicznie pobiera i formatuje szczegółowe wyniki testu dla jednego użytkownika.
    """

    stmt = (
        select(UserActivity)
        .options(
            selectinload(UserActivity.results).options(
                selectinload(Result.question).selectinload(Question.answers)
            ),
            selectinload(UserActivity.test_instance)
        )
        .where(UserActivity.activity_id == activity_id)
    )
    user_activity = (await db.execute(stmt)).scalar_one_or_none()

    if not user_activity or not user_activity.results:
        logging.warning(f"Nie znaleziono aktywności lub wyników dla activity_id: {activity_id}")
        return []

    skeleton = user_activity.questions_data or {}
    if isinstance(skeleton, str):
        try:
            skeleton = json.loads(skeleton)
        except json.JSONDecodeError:
            logging.error(f"Nie udało się sparsować JSON ze szkieletu dla activity_id: {activity_id}")
            skeleton = {}

    answer_orders_map = skeleton.get("answer_orders", {})
    instance_name = user_activity.test_instance.instance_name if user_activity.test_instance else None
    sorted_results = sorted(user_activity.results, key=lambda r: (r.timestamp, r.result_id))
    formatted = []
    for result in sorted_results:
        q = result.question
        if not q:
            logging.warning(
                f"Pominięto wynik dla brakującego pytania (ID: {result.question_id}) w activity_id: {activity_id}")
            continue

        user_response = result.user_response or []
        historical_answer_ids = answer_orders_map.get(q.question_id, [])
        all_answers_map = {a.answer_id: a for a in (q.answers or []) if a.answer_id is not None}
        question_type = q.question_type

        answers = []
        for a_id in historical_answer_ids:
            if a_id in all_answers_map:
                a = all_answers_map[a_id]
                answers.append({
                    "answer_id": a.answer_id,
                    "text": a.answer_text,
                    "is_correct": bool(a.is_correct),
                    "match_id": a.match_id,
                    "side": a.side,
                })

        if not historical_answer_ids and question_type not in ("Rating", "FillInTheBlank"):
            answers = [
                {
                    "answer_id": a.answer_id, "text": a.answer_text, "is_correct": bool(a.is_correct),
                    "match_id": a.match_id, "side": a.side,
                }
                for a in (q.answers or []) if a.answer_id is not None and a.is_active
            ]

        extra_data = q.extra_data or {}

        # --- Sekcja budowania `correct_answers` ---
        correct_answers = []
        if question_type == "DragAndDropOrder":
            for answer_id in extra_data.get("correct_order", []):
                answer = next((a for a in answers if a['answer_id'] == answer_id), None)
                if answer:
                    correct_answers.append(answer)

        elif question_type == "FillInTheBlank":
            for part in extra_data if isinstance(extra_data, list) else []:
                if part.get("type") == "text":
                    correct_answers.append(part)
                elif part.get("type") == "blank":
                    correct_answer_id = part.get("correct_answer_id")
                    answer_details = next((a for a in answers if a['answer_id'] == correct_answer_id), None)
                    if answer_details:
                        correct_answers.append({
                            "type": "answer",
                            "text": answer_details['text'],
                            "id": answer_details['answer_id']
                        })

        elif question_type == "MatchingMultiple":
            pairs = {}
            for answer in answers:
                match_id = answer.get('match_id')
                if not match_id:
                    continue

                if match_id not in pairs:
                    pairs[match_id] = {}

                side = answer.get('side', 'left')
                pairs[match_id][side] = {'answer_id': answer['answer_id'], 'text': answer['text']}

            correct_answers = list(pairs.values())

        else:
            correct_answers = [a for a in answers if a.get('is_correct')]

        formatted.append(
            {
                "question_id": q.question_id,
                "question_text": q.question_text,
                "question_type": question_type,
                "points_value": int(q.points_value) if q.points_value is not None else 1,
                "points_collected": result.points_collected,
                "user_response": user_response,
                "answers": answers,
                "correct_answers": correct_answers,
                "extra_data": extra_data,
                "instance_name": instance_name,
            }
        )

    return formatted


def get_user_id_from_session(request: Request):
    """Zależność do pobierania user_id z sesji."""
    user_id = request.session.get('user_id')
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user_id in session.")
    return user_id


async def get_current_db_user_from_session(request: Request, db: AsyncSession = Depends(get_session)):
    user_id = request.session.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail="User not logged in.")

    stmt = (
        select(User)
        .options(
            load_only(
                User.user_id, User.login, User.role, User.name, User.surname,
                User.email, User.user_index, User.avatar_path, User.created_at
            )
        )
        .where(User.user_id == user_id)
        .limit(1)
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        request.session.clear()
        raise HTTPException(status_code=401, detail="User not found.")

    return user
