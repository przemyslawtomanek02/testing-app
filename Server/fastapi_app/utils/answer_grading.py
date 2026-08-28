from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.dbmodels import Question, Answer


async def is_answer_correct(db: AsyncSession, question_id: str, question_type: str, user_response: Any) -> bool:
    """Zwraca czy odpowiedź jest w pełni poprawna, bez liczenia punktów/kar.

    Odzwierciedla te same reguły porównania co `calculate_points` w
    `routes/users/user_utils.py`, ale bez zależności od GradingScheme
    (partial credit / kary) — używane przez kursy e-learningowe, gdzie
    liczy się wyłącznie "poprawne / niepoprawne".
    """
    user_response = user_response or []

    q_stmt = select(Question.extra_data).where(Question.question_id == question_id).limit(1)
    q_row = (await db.execute(q_stmt)).one_or_none()
    if not q_row:
        return False
    extra_data: Dict[str, Any] = q_row[0] or {}

    if question_type == 'SingleChoice':
        if not user_response:
            return False
        user_answer_id = user_response[0].get("answer_id")
        if not user_answer_id:
            return False
        ans_stmt = select(Answer.is_correct).where(
            Answer.answer_id == user_answer_id,
            Answer.is_active.is_(True),
        )
        is_correct = (await db.execute(ans_stmt)).scalar_one_or_none()
        return bool(is_correct)

    if question_type in ('MultipleChoice', 'TrueFalse'):
        ans_stmt = select(Answer.answer_id, Answer.is_correct).where(
            Answer.question_id == question_id,
            Answer.is_active.is_(True),
        )
        all_answers = list((await db.execute(ans_stmt)).all())
        if not all_answers:
            return False
        user_choices = {item['answer_id']: item['user_answer'] == 'True' for item in user_response}
        for answer_id, correct in all_answers:
            if bool(correct) != bool(user_choices.get(answer_id, False)):
                return False
        return True

    if question_type == 'DragAndDropOrder':
        correct_order: List[str] = (extra_data or {}).get("correct_order", []) or []
        if not correct_order:
            return False
        user_order = [item.get('answer_id') for item in user_response]
        return user_order == correct_order

    if question_type == 'MatchingMultiple':
        ans_stmt = select(Answer.answer_id, Answer.match_id).where(
            Answer.question_id == question_id,
            Answer.is_active.is_(True),
        )
        all_answers = list((await db.execute(ans_stmt)).all())
        if not all_answers:
            return False
        answer_to_match_map = {a_id: m_id for a_id, m_id in all_answers if m_id is not None}
        user_response_obj = user_response[0] if user_response else {}
        user_left_order = user_response_obj.get('left_order', []) or []
        user_right_order = user_response_obj.get('right_order', []) or []
        if not user_left_order or len(user_left_order) != len(user_right_order):
            return False

        has_correct_order = bool((extra_data or {}).get("hasCorrectOrder"))
        if has_correct_order:
            correct_order_match_ids = extra_data.get('correct_order', [])
            total_items = len(correct_order_match_ids)
            if total_items == 0 or len(user_left_order) != total_items:
                return False
            for i in range(total_items):
                left_m = answer_to_match_map.get(user_left_order[i])
                right_m = answer_to_match_map.get(user_right_order[i])
                if left_m is None or left_m != right_m or left_m != correct_order_match_ids[i]:
                    return False
            return True
        else:
            total_possible_pairs = max(len(all_answers) // 2, 0)
            if total_possible_pairs == 0:
                return False
            correct_matches = sum(
                1 for i in range(len(user_left_order))
                if answer_to_match_map.get(user_left_order[i]) is not None
                and answer_to_match_map.get(user_left_order[i]) == answer_to_match_map.get(user_right_order[i])
            )
            return correct_matches == total_possible_pairs

    if question_type == 'FillInTheBlank':
        parts = extra_data if isinstance(extra_data, list) else (extra_data or [])
        if not isinstance(parts, list):
            return False

        def nearest_truth_text(parts, start_idx, step):
            j = start_idx + step
            while 0 <= j < len(parts):
                p = parts[j]
                if isinstance(p, dict) and p.get('type') == 'text':
                    return (p.get('value') or '').strip()
                j += step
            return None

        blanks = []
        for i, p in enumerate(parts):
            if not (isinstance(p, dict) and p.get('type') == 'blank'):
                continue
            blanks.append({
                "idx": i,
                "correct_id": p.get("correct_answer_id"),
                "left_text": nearest_truth_text(parts, i, -1),
                "right_text": nearest_truth_text(parts, i, +1),
            })
        if not blanks:
            return False

        user_parts = user_response if isinstance(user_response, list) else []
        answer_positions = []
        for idx, it in enumerate(user_parts):
            if isinstance(it, dict) and it.get('type') in ('answer', 'blank'):
                ans_id = it.get('answer_id') or it.get('id')
                if ans_id:
                    answer_positions.append((idx, ans_id))

        def nearest_user_text(seq, i, step):
            j = i + step
            while 0 <= j < len(seq):
                it = seq[j]
                if isinstance(it, dict) and it.get('type') == 'text':
                    return (it.get('value') or '').strip()
                j += step
            return None

        used_answer_pos = set()
        for b in blanks:
            corr_id = b["correct_id"]
            lt, rt = b["left_text"], b["right_text"]
            matched = False
            for pos_idx, (u_idx, ans_id) in enumerate(answer_positions):
                if pos_idx in used_answer_pos or ans_id != corr_id:
                    continue
                left_ok = (lt is None) or (nearest_user_text(user_parts, u_idx, -1) == lt)
                right_ok = (rt is None) or (nearest_user_text(user_parts, u_idx, +1) == rt)
                if left_ok and right_ok:
                    matched = True
                    used_answer_pos.add(pos_idx)
                    break
            if not matched:
                return False
        return True

    if question_type == 'TypedFillInBlank':
        parts = (extra_data or {}).get('parts', [])
        blanks = [p for p in parts if isinstance(p, dict) and p.get('type') == 'blank']
        if not blanks:
            return False

        ans_stmt = (
            select(Answer.answer_id, Answer.answer_text)
            .where(Answer.question_id == question_id, Answer.is_active.is_(True))
            .order_by(Answer.answer_id)
        )
        db_rows = (await db.execute(ans_stmt)).all()
        db_by_id = {row[0]: (row[1] or '').strip().lower() for row in db_rows}
        db_by_pos = [(row[1] or '').strip().lower() for row in db_rows]

        user_items = [item for item in (user_response if isinstance(user_response, list) else []) if isinstance(item, dict)]

        for idx, blank in enumerate(blanks):
            correct_id = str(blank.get('correct_answer_id', ''))
            correct_text = db_by_id.get(correct_id, '')
            if not correct_text and idx < len(db_by_pos):
                correct_text = db_by_pos[idx]
            user_text = (user_items[idx].get('typed_text') or '').strip().lower() if idx < len(user_items) else ''
            if not (user_text and correct_text and user_text == correct_text):
                return False
        return True

    if question_type == 'Rating':
        extra_data = extra_data or {}
        if not extra_data.get("correct_enabled"):
            return True
        if not user_response:
            return False
        if extra_data.get('use_range'):
            user_value = (user_response[0] or {}).get("selected_range")
            correct_range = extra_data.get('correct_range')
            return bool(
                user_value and correct_range
                and user_value[0] >= correct_range[0]
                and user_value[1] <= correct_range[1]
            )
        user_value = (user_response[0] or {}).get("chosen_value")
        correct_value = extra_data.get('correct_value')
        return user_value is not None and user_value == correct_value

    return False
