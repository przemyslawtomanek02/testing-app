import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from redis.asyncio import Redis
from sqlalchemy import delete, update, select
from sqlalchemy.ext.asyncio import AsyncSession

from ... import schemas
from ...database.dbmodels import Answer, Question, Test
from ...utils.dependencies import is_admin
from ...config import settings
from ...utils.helpers import generate_id, build_question_structure

# --- Router ---
router = APIRouter(
    tags=["Admin - Utilities"]
)

redis_client = Redis(host='localhost', port=6379, decode_responses=True)


@router.get("/get_image/{ulid}.jpeg")
async def get_image(ulid: str, is_user_admin: bool = Depends(is_admin)):
    """Serwuje plik obrazka na podstawie jego ID."""

    path = os.path.join(settings.UPLOAD_FOLDER, f'{ulid}.jpeg')

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found.")

    return FileResponse(path, media_type='image/jpeg')


# todo dodaj button na front
@router.post("/clear_redis_sessions", response_model=schemas.StatusResponse)
async def clear_redis_sessions(is_user_admin: bool = Depends(is_admin)):
    """Czyści wszystkie klucze sesji z Redisa."""
    try:
        keys_to_delete = await redis_client.keys("session:*")
        if keys_to_delete:
            await redis_client.delete(*keys_to_delete)

        message = f"All sessions cleared ({len(keys_to_delete)} keys)."
        return {"status": "success", "message": message}

    except Exception:
        raise HTTPException(status_code=500, detail="Failed to clear sessions.")


async def get_edit_questions(db: AsyncSession, test_id: str):
    """
    Pobiera i w pełni formatuje dane testu i jego pytań dla panelu edycji.
    """
    stmt = (
        select(
            Test.name.label("test_name"),
            Test.description.label("test_description"),
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
        .join(Question, Question.test_id == Test.test_id)
        .join(Answer, (Answer.question_id == Question.question_id) & (Answer.is_active == True), isouter=True)
        .where(Test.test_id == test_id)
        .order_by(Question.question_id)
    )

    res = await db.execute(stmt)
    rows = res.mappings().all()

    if not rows:
        return None

    test_metadata = {
        "test_name": rows[0]["test_name"],
        "test_description": rows[0]["test_description"],
    }

    questions_structured = build_question_structure(rows, include_admin_fields=True)

    return {
        **test_metadata,
        "questions": questions_structured,
    }


async def save_answers_for_question(db: AsyncSession, question_type: str, question_data: dict, question_id: str):
    """
    Inteligentnie aktualizuje odpowiedzi dla pytania (Update, Insert, Delete),
    zachowując istniejące ID i poprawnie mapując extra_data.
    """
    result = await db.execute(select(Answer).where(Answer.question_id == question_id))
    existing_answers_map = {ans.answer_id: ans for ans in result.scalars().all()}

    incoming_answers_data = question_data.get('answers', [])
    print(incoming_answers_data)

    if question_type == "MatchingMultiple":
        processed_answer_ids = set()

        for pair_data in incoming_answers_data:
            match_id = pair_data.get('id') or generate_id()

            for side in ['left', 'right']:
                side_data = pair_data.get(side, {})
                answer_id = side_data.get('answer_id')
                answer_text = side_data.get('text', "")

                if answer_id and answer_id in existing_answers_map:
                    db_answer = existing_answers_map[answer_id]
                    db_answer.answer_text = answer_text
                    db_answer.match_id = match_id
                    db_answer.is_active = True

                    processed_answer_ids.add(answer_id)
                elif answer_text:
                    new_answer_id = generate_id()
                    db.add(Answer(
                        answer_id=new_answer_id, question_id=question_id,
                        answer_text=answer_text, match_id=match_id, side=side, is_active=True
                    ))

        ids_to_archive = set(existing_answers_map.keys()) - processed_answer_ids
        if ids_to_archive:
            await db.execute(
                update(Answer)
                .where(Answer.answer_id.in_(ids_to_archive))
                .values(is_active=False)
            )

        return

    processed_ids = set()
    temp_to_db_id_map = {}

    for answer_data in incoming_answers_data:
        answer_id = answer_data.get('answer_id')

        if answer_id is not None and str(answer_id) in existing_answers_map:
            db_answer = existing_answers_map[answer_id]
            db_answer.answer_text = answer_data.get("text", "") or ""
            db_answer.is_correct = bool(answer_data.get("is_correct", False))
            db_answer.is_active = True
            processed_ids.add(answer_id)
            temp_to_db_id_map[str(answer_id)] = answer_id
        else:
            new_id = generate_id()
            db.add(Answer(
                answer_id=new_id,
                question_id=question_id,
                answer_text=answer_data.get("text", "") or "",
                is_correct=bool(answer_data.get("is_correct", False)),
                is_active=True
            ))
            # Map using answer_id if set, otherwise fall back to the frontend temp 'id'
            temp_key = answer_id if answer_id is not None else answer_data.get('id')
            if temp_key is not None:
                temp_to_db_id_map[str(temp_key)] = new_id

    ids_to_archive = set(existing_answers_map.keys()) - processed_ids
    if ids_to_archive:
        await db.execute(
            update(Answer)
            .where(Answer.answer_id.in_(ids_to_archive))
            .values(is_active=False)
        )

    extra_data = question_data.get('extra_data')
    if extra_data:
        requires_update = False

        if question_type == "DragAndDropOrder" and isinstance(extra_data, dict):
            temp_order = extra_data.get("correct_order", [])
            final_order = [temp_to_db_id_map.get(str(tid)) for tid in temp_order if str(tid) in temp_to_db_id_map]

            if extra_data.get("correct_order") != final_order:
                extra_data['correct_order'] = final_order
                requires_update = True

        elif question_type == "FillInTheBlank" and isinstance(extra_data, list):
            requires_update = True
            for part in extra_data:
                if part.get('type') == 'blank':
                    temp_id = str(part.get('correct_answer_id'))
                    new_id = temp_to_db_id_map.get(temp_id)
                    if new_id and part['correct_answer_id'] != new_id:
                        part['correct_answer_id'] = new_id

        elif question_type == "TypedFillInBlank" and isinstance(extra_data, dict):
            requires_update = True
            parts = extra_data.get('parts', [])
            for part in parts:
                if part.get('type') == 'blank':
                    temp_id = str(part.get('correct_answer_id'))
                    new_id = temp_to_db_id_map.get(temp_id)
                    if new_id and part['correct_answer_id'] != new_id:
                        part['correct_answer_id'] = new_id
            extra_data['parts'] = parts

        elif question_type == "Rating":
            requires_update = True

        if requires_update:
            await db.execute(
                update(Question)
                .where(Question.question_id == question_id)
                .values(extra_data=extra_data)
            )
