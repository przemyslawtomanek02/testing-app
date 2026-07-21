import os
import random
import base64
import io as _io
import json as json_module
from collections import defaultdict
from typing import List, Optional
import logging
from pathlib import Path
import aiofiles
import aiofiles.os
from PIL import Image as PILImage
from sqlalchemy import select, func, update, delete
from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException, status, Request, Body
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from ...database.dbmodels import Test, Question, TestInstance, Answer

from ... import schemas
from ...database.database import get_session
from ...utils.dependencies import is_admin
from ...utils.helpers import generate_id, save_as_webp
from .admin_utils import get_edit_questions, save_answers_for_question
from ...config import settings

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Test Management"]
)


@router.post("/create_new_test", response_model=schemas.StatusResponse, status_code=status.HTTP_201_CREATED)
async def create_new_test(
        test_name: str = Form(...),
        test_description: str = Form(...),
        questions_json: List[str] = Form(..., alias="questions"),
        images: Optional[List[UploadFile]] = File(None),
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    test_id = generate_id()

    print(questions_json)

    try:
        questions = [schemas.QuestionCreateAndEdit.model_validate_json(q) for q in questions_json]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid question JSON format.")

    try:
        async with db.begin():

            test = Test(
                test_id=test_id,
                name=test_name,
                description=test_description,
                number_of_questions=len(questions),
            )
            db.add(test)

            for idx, question in enumerate(questions):
                question_id = generate_id()
                image_path = None

                if images and idx < len(images) and images[idx] and images[idx].filename:
                    image_path = f"{question_id}.webp"
                    save_path = os.path.join(settings.UPLOAD_FOLDER, image_path)
                    await save_as_webp(images[idx], save_path)

                question_row = Question(
                    question_id=question_id,
                    test_id=test_id,
                    question_type=question.type,
                    question_text=question.question,
                    image_path=image_path,
                    extra_data=question.extra_data,
                    points_value=question.points_value,
                )
                db.add(question_row)

                await save_answers_for_question(
                    db=db,
                    question_type=question.type,
                    question_data=question.model_dump(),
                    question_id=question_id,
                )

            return {"status": "success", "message": "Test created successfully!"}

    except SQLAlchemyError:
        logging.exception("DB error while creating test")
        raise HTTPException(status_code=500, detail="Database error while creating test.")


@router.get("/get_admin_tests", response_model=List[schemas.TestAdminSummary])
async def get_admin_tests(
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Pobiera listę wszystkich testów wraz z liczbą ich instancji."""
    stmt = (
        select(
            Test.test_id,
            Test.name,
            Test.description,
            Test.number_of_questions,
            Test.created_at,
            func.count(TestInstance.instance_id).label("instance_count"),
        )
        .outerjoin(TestInstance, TestInstance.test_id == Test.test_id)
        .group_by(
            Test.test_id,
            Test.name,
            Test.description,
            Test.number_of_questions,
            Test.created_at,
        )
        .order_by(Test.created_at.desc())
    )

    result = await db.execute(stmt)
    return result.mappings().all()


@router.get("/get_admin_one_test/{ulid}", response_model=schemas.TestAdminDetail)
async def get_admin_one_test(
        ulid: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Pobiera szczegółowe dane jednego testu na potrzeby edycji."""

    test_data = await get_edit_questions(db, ulid)

    if not test_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")

    return test_data


@router.delete("/delete_test/{ulid_id}", response_model=schemas.StatusResponse)
async def delete_test(
    ulid_id: str,
    db: AsyncSession = Depends(get_session),
    is_user_admin: bool = Depends(is_admin)
):
    async with db.begin():
        exists = await db.execute(select(Test.test_id).where(Test.test_id == ulid_id))
        if exists.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Test not found")

        await db.execute(delete(TestInstance).where(TestInstance.test_id == ulid_id))
        result = await db.execute(delete(Test).where(Test.test_id == ulid_id))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Test not found")

    return {"status": "success", "message": f"Test o ID {ulid_id} został usunięty."}



@router.put("/edit_test/{ulid_id}", response_model=schemas.StatusResponse)
async def edit_test(
        ulid_id: str,
        request: Request,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Aktualizuje istniejący test, jego pytania, odpowiedzi i obrazki."""

    form_data = await request.form()
    test_name = form_data.get("test_name")
    test_description = form_data.get("test_description")
    questions_json = form_data.getlist("questions")

    images_map = {}
    for key, value in form_data.multi_items():
        if not key.startswith("images_"):
            continue
        if not hasattr(value, "filename"):
            continue
        try:
            image_index = int(key.split("_")[-1])
        except ValueError:
            continue
        images_map[image_index] = value

    if not test_name or not questions_json:
        raise HTTPException(status_code=400, detail="Test name and questions are required.")

    try:
        questions_data = [schemas.QuestionCreateAndEdit.model_validate_json(q) for q in questions_json]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid question JSON format.")

    async with db.begin():

        res = await db.execute(select(Question.question_id, Question.image_path).where(Question.test_id == ulid_id))
        existing_questions_map = {qid: img for qid, img in res.all()}

        incoming_existing_ids = {
            q.question_id for q in questions_data
            if q.question_id and not str(q.question_id).startswith("new_")
        }

        ids_to_archive = set(existing_questions_map.keys()) - incoming_existing_ids

        if ids_to_archive:
            await db.execute(
                update(Question)
                .where(Question.question_id.in_(ids_to_archive))
                .values(is_active=False)
            )

        active_questions_count = len(questions_data)
        await db.execute(
            update(Test)
            .where(Test.test_id == ulid_id)
            .values(
                name=test_name,
                description=test_description,
                number_of_questions=active_questions_count,
            )
        )

        for q_index, question in enumerate(questions_data):
            is_new = not question.question_id or question.question_id.startswith('new_')
            q_id = question.question_id if not is_new else generate_id()

            file_for_this_q = images_map.get(q_index)

            final_image_path = None
            if not is_new:
                final_image_path = existing_questions_map.get(q_id)

            if file_for_this_q and file_for_this_q.filename:
                new_image_path = f"{q_id}.webp"
                save_path = Path(settings.UPLOAD_FOLDER) / new_image_path
                os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)

                old_image_path = existing_questions_map.get(q_id)
                if old_image_path and old_image_path != new_image_path:
                    try:
                        await aiofiles.os.remove(Path(settings.UPLOAD_FOLDER) / old_image_path)
                    except OSError:
                        logging.warning(f"Could not remove old image file: {old_image_path}")
                await save_as_webp(file_for_this_q, save_path)
                final_image_path = new_image_path

            if is_new:
                # INSERT pytania
                db.add(Question(
                    question_id=q_id,
                    test_id=ulid_id,
                    question_type=question.type,
                    question_text=question.question,
                    image_path=final_image_path,
                    extra_data=question.extra_data,
                    points_value=question.points_value,
                ))
            else:
                # UPDATE pytania
                await db.execute(
                    update(Question)
                    .where(Question.question_id == q_id)
                    .values(
                        question_type=question.type,
                        question_text=question.question,
                        image_path=final_image_path,
                        extra_data=question.extra_data,
                        points_value=question.points_value,
                    )
                )

            await save_answers_for_question(db, question.type, question.model_dump(), q_id)

        active_questions_res = await db.execute(
            select(Question.question_id)
            .where(Question.test_id == ulid_id, Question.is_active == True)
        )
        all_active_q_ids = [row[0] for row in active_questions_res.all()]

        instances_to_update_res = await db.execute(
            select(TestInstance)
            .where(TestInstance.test_id == ulid_id, TestInstance.use_fixed_question_pool == True)
        )
        instances_to_update = instances_to_update_res.scalars().all()

        for instance in instances_to_update:
            num_questions_for_instance = instance.num_questions

            if len(all_active_q_ids) > num_questions_for_instance:
                new_fixed_ids = random.sample(all_active_q_ids, num_questions_for_instance)
            else:
                new_fixed_ids = all_active_q_ids

            instance.fixed_question_ids = new_fixed_ids
            logging.info(f"Regenerated question pool for instance {instance.instance_id} with {len(new_fixed_ids)} questions.")

    return {"status": "success", "message": "Test edited successfully and fixed instances have been updated."}


@router.get("/export_test/{test_id}")
async def export_test(
        test_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Eksportuje pełne dane testu jako JSON (z obrazami w base64)."""
    test_data = await get_edit_questions(db, test_id)
    if not test_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")

    questions = test_data.get("questions", [])
    for q in questions:
        image_filename = q.get("image")
        if image_filename:
            image_path = os.path.join(settings.UPLOAD_FOLDER, image_filename)
            if os.path.exists(image_path):
                async with aiofiles.open(image_path, "rb") as f:
                    content = await f.read()
                q["image_base64"] = base64.b64encode(content).decode("utf-8")

    return JSONResponse(content={
        "export_version": 1,
        "test_name": test_data["test_name"],
        "test_description": test_data["test_description"],
        "questions": questions,
    })


@router.post("/import_test", response_model=schemas.StatusResponse, status_code=status.HTTP_201_CREATED)
async def import_test(
        payload: dict = Body(...),
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Importuje test z danych JSON (eksportowanych przez export_test)."""
    test_name = payload.get("test_name") or "Imported Test"
    test_description = payload.get("test_description") or ""
    questions_data = payload.get("questions") or []

    if not questions_data:
        raise HTTPException(status_code=400, detail="No questions found in import data.")

    test_id = generate_id()

    try:
        async with db.begin():
            db.add(Test(
                test_id=test_id,
                name=test_name,
                description=test_description,
                number_of_questions=len(questions_data),
            ))

            for q_data in questions_data:
                q_id = generate_id()
                q_type = q_data.get("type", "SingleChoice")

                # Handle base64 image
                image_path = None
                image_base64 = q_data.get("image_base64")
                if image_base64:
                    image_path = f"{q_id}.webp"
                    save_path = os.path.join(settings.UPLOAD_FOLDER, image_path)
                    try:
                        img_bytes = base64.b64decode(image_base64)
                        img = PILImage.open(_io.BytesIO(img_bytes))
                        img.save(save_path, format="WEBP", quality=85)
                    except Exception:
                        logging.warning(f"Could not save image for question {q_id}")
                        image_path = None

                # Pre-generate answer IDs and build old->new map before inserting
                old_to_new: dict = {}
                answers_raw = q_data.get("answers") or []
                prepared_answers = []

                if q_type == "MatchingMultiple":
                    pairs: dict = defaultdict(list)
                    for ans in answers_raw:
                        pairs[str(ans.get("match_id", ""))].append(ans)
                    for old_match_id, group in pairs.items():
                        new_match_id = generate_id()
                        for ans in group:
                            new_ans_id = generate_id()
                            old_ans_id = ans.get("answer_id")
                            if old_ans_id:
                                old_to_new[str(old_ans_id)] = new_ans_id
                            prepared_answers.append((new_ans_id, ans, ans.get("side"), new_match_id))
                else:
                    for ans in answers_raw:
                        new_ans_id = generate_id()
                        old_ans_id = ans.get("answer_id")
                        if old_ans_id:
                            old_to_new[str(old_ans_id)] = new_ans_id
                        prepared_answers.append((new_ans_id, ans, None, None))

                # Remap extra_data IDs upfront (before any DB insert)
                extra_data = q_data.get("extra_data")
                if isinstance(extra_data, str):
                    try:
                        extra_data = json_module.loads(extra_data)
                    except Exception:
                        extra_data = {}

                if extra_data and old_to_new:
                    if q_type == "DragAndDropOrder" and isinstance(extra_data, dict):
                        old_order = extra_data.get("correct_order") or []
                        extra_data["correct_order"] = [
                            old_to_new[str(oid)] for oid in old_order if str(oid) in old_to_new
                        ]
                    elif q_type == "FillInTheBlank" and isinstance(extra_data, list):
                        for part in extra_data:
                            if part.get("type") == "blank":
                                old_aid = str(part.get("correct_answer_id", ""))
                                if old_aid in old_to_new:
                                    part["correct_answer_id"] = old_to_new[old_aid]
                    elif q_type == "TypedFillInBlank" and isinstance(extra_data, dict):
                        for part in (extra_data.get("parts") or []):
                            if part.get("type") == "blank":
                                old_aid = str(part.get("correct_answer_id", ""))
                                if old_aid in old_to_new:
                                    part["correct_answer_id"] = old_to_new[old_aid]

                db.add(Question(
                    question_id=q_id,
                    test_id=test_id,
                    question_type=q_type,
                    question_text=q_data.get("question", ""),
                    image_path=image_path,
                    extra_data=extra_data,
                    points_value=q_data.get("points_value", 1),
                ))

                for new_ans_id, ans, side, new_match_id in prepared_answers:
                    if new_match_id is not None:
                        db.add(Answer(
                            answer_id=new_ans_id,
                            question_id=q_id,
                            answer_text=ans.get("text", ""),
                            match_id=new_match_id,
                            side=side,
                            is_active=True,
                        ))
                    else:
                        db.add(Answer(
                            answer_id=new_ans_id,
                            question_id=q_id,
                            answer_text=ans.get("text", ""),
                            is_correct=bool(ans.get("is_correct", False)),
                            is_active=True,
                        ))

    except SQLAlchemyError:
        logging.exception("DB error during test import")
        raise HTTPException(status_code=500, detail="Failed to import test.")

    return {"status": "success", "message": f"Test '{test_name}' imported successfully!"}
