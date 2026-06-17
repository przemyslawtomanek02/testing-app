import os
import random
from typing import List, Optional
import logging
from pathlib import Path
import aiofiles.os
from sqlalchemy import select, func, update, delete
from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException, status, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from ...database.dbmodels import Test, Question, TestInstance

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
