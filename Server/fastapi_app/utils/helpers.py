import io
import logging
from typing import List, Mapping, Optional
import aiofiles
from PIL import Image
from fastapi import UploadFile
from ..database.dbmodels import TestInstance as TI, Question as Q
import ulid

def generate_id():
    """
    Generate a unique identifier using ULID.

    Returns:
        str: A unique identifier.
    """
    return str(ulid.new())


SAFE_RATING_KEYS = ("available_range", "correct_enabled", "use_range")


def filter_extra_data(question_type: Optional[str], extra_data: Optional[dict], include_admin_fields: bool) -> dict:
    if not extra_data:
        return {}
    if include_admin_fields:
        return extra_data
    if question_type == "Rating":
        return {k: extra_data[k] for k in SAFE_RATING_KEYS if k in extra_data}
    return extra_data


def build_question_structure(data, include_admin_fields: bool = False) -> List[dict]:
    """
    Uniwersalny builder struktury pytań:
    - przyjmuje płaskie wiersze (mappings) LUB obiekty ORM,
    - zwraca listę pytan w formacie {"question_id", "question", "type", "image", "answers", "extra_data", "points_value"}.
    """

    # GAŁĄŹ 1: płaskie wiersze
    if isinstance(data, list) and (len(data) == 0 or isinstance(data[0], Mapping)):
        questions: dict[str, dict] = {}
        for row in data:
            q_id = row.get("question_id")
            if not q_id:
                continue

            if q_id not in questions:
                q_type = row.get("question_type")
                extra_data_from_db = row.get("extra_data")
                if isinstance(extra_data_from_db, str):
                    try:
                        import json
                        extra_data_from_db = json.loads(extra_data_from_db)
                    except Exception:
                        extra_data_from_db = {}
                safe_extra = filter_extra_data(q_type, extra_data_from_db, include_admin_fields)

                questions[q_id] = {
                    "question_id": q_id,
                    "question": row.get("question_text"),
                    "type": q_type,
                    "image": row.get("image_path"),
                    "answers": [],
                    "extra_data": safe_extra,
                    "points_value": row.get("points_value"),
                }

            ans_id = row.get("answer_id")
            if ans_id:
                ans = {
                    "answer_id": ans_id,
                    "text": row.get("answer_text"),
                    "match_id": row.get("match_id"),
                    "side": row.get("side"),
                }
                if include_admin_fields:
                    ans["is_correct"] = row.get("is_correct")
                questions[q_id]["answers"].append(ans)

        return list(questions.values())

    # GAŁĄŹ 2: ORM
    if isinstance(data, TI):
        if not data.test:
            return []
        orm_questions = data.test.questions or []
        return build_orm_questions(orm_questions, include_admin_fields)

    # GAŁĄŹ 3: ORM — lista Question
    if isinstance(data, list) and (len(data) == 0 or isinstance(data[0], Q)):
        return build_orm_questions(data, include_admin_fields)

    raise TypeError("Unsupported data type for build_question_structure().")


def build_orm_questions(orm_questions: List["Q"], include_admin_fields: bool) -> List[dict]:
    out: List[dict] = []
    for q in orm_questions:
        extra = filter_extra_data(q.question_type, q.extra_data, include_admin_fields)

        q_dict = {
            "question_id": q.question_id,
            "question": q.question_text,
            "type": q.question_type,
            "image": q.image_path,
            "answers": [],
            "extra_data": extra,
            "points_value": q.points_value,
        }

        active_answers = [a for a in (q.answers or []) if a.is_active]
        for a in active_answers:
            ans = {
                "answer_id": a.answer_id,
                "text": a.answer_text,
                "match_id": a.match_id,
                "side": a.side,
            }
            if include_admin_fields:
                ans["is_correct"] = getattr(a, "is_correct", None)
            q_dict["answers"].append(ans)

        out.append(q_dict)
    return out


async def save_as_webp(upload: UploadFile, save_path, quality: int = 85):
    """Konwertuje dowolny uploadowany obraz do WebP."""
    content = await upload.read()
    try:
        img = Image.open(io.BytesIO(content))
        img.save(save_path, format="WEBP", quality=quality)
    except Exception as e:
        logging.error(f"WebP convert error: {e}")
        async with aiofiles.open(save_path, "wb") as f:
            await f.write(content)
