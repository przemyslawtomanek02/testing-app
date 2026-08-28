import os
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException, status, Body
from sqlalchemy import select, func, update, delete
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ... import schemas
from ...database.database import get_session
from ...database.dbmodels import Course, CoursePage, Question, CourseProgress
from ...utils.dependencies import is_admin
from ...utils.helpers import generate_id, save_as_webp, build_question_structure
from .admin_utils import save_answers_for_question
from ...config import settings

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Course Management"]
)


def _page_to_admin_dict(page: CoursePage) -> dict:
    question = None
    if page.page_type == "question" and page.question:
        built = build_question_structure([page.question], include_admin_fields=True)
        question = built[0] if built else None

    return {
        "page_id": page.page_id,
        "order_index": page.order_index,
        "page_type": page.page_type,
        "title": page.title,
        "content_markdown": page.content_markdown,
        "image": page.image_path,
        "question": question,
    }


@router.post("/courses/create", status_code=status.HTTP_201_CREATED)
async def create_course(
        title: str = Form(...),
        description: str = Form(""),
        cover_image: Optional[UploadFile] = File(None),
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin),
):
    course_id = generate_id()

    cover_image_path = None
    if cover_image and cover_image.filename:
        cover_image_path = f"{course_id}.webp"
        save_path = os.path.join(settings.UPLOAD_FOLDER, cover_image_path)
        await save_as_webp(cover_image, save_path)

    try:
        async with db.begin():
            db.add(Course(
                course_id=course_id,
                title=title,
                description=description,
                cover_image_path=cover_image_path,
            ))
    except SQLAlchemyError:
        logging.exception("DB error while creating course")
        raise HTTPException(status_code=500, detail="Database error while creating course.")

    return {"status": "success", "message": "Course created successfully!", "course_id": course_id}


@router.get("/courses", response_model=List[schemas.CourseAdminSummary])
async def get_admin_courses(
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin),
):
    stmt = (
        select(
            Course.course_id,
            Course.title,
            Course.description,
            Course.cover_image_path,
            Course.is_published,
            Course.created_at,
            func.count(CoursePage.page_id).label("page_count"),
        )
        .outerjoin(CoursePage, CoursePage.course_id == Course.course_id)
        .group_by(
            Course.course_id,
            Course.title,
            Course.description,
            Course.cover_image_path,
            Course.is_published,
            Course.created_at,
        )
        .order_by(Course.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.mappings().all()


@router.get("/courses/{course_id}", response_model=schemas.CourseAdminDetail)
async def get_admin_course(
        course_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin),
):
    stmt = (
        select(Course)
        .where(Course.course_id == course_id)
        .options(
            selectinload(Course.pages)
            .selectinload(CoursePage.question)
            .selectinload(Question.answers)
        )
    )
    course = (await db.execute(stmt)).unique().scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    pages = sorted(course.pages, key=lambda p: p.order_index)

    return {
        "course_id": course.course_id,
        "title": course.title,
        "description": course.description,
        "cover_image_path": course.cover_image_path,
        "is_published": course.is_published,
        "pages": [_page_to_admin_dict(p) for p in pages],
    }


@router.put("/courses/{course_id}", response_model=schemas.StatusResponse)
async def update_course(
        course_id: str,
        title: str = Form(...),
        description: str = Form(""),
        is_published: bool = Form(False),
        cover_image: Optional[UploadFile] = File(None),
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin),
):
    values = {"title": title, "description": description, "is_published": is_published}

    if cover_image and cover_image.filename:
        cover_image_path = f"{course_id}.webp"
        save_path = os.path.join(settings.UPLOAD_FOLDER, cover_image_path)
        await save_as_webp(cover_image, save_path)
        values["cover_image_path"] = cover_image_path

    async with db.begin():
        result = await db.execute(update(Course).where(Course.course_id == course_id).values(**values))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Course not found")

    return {"status": "success", "message": "Course updated successfully!"}


@router.delete("/courses/{course_id}", response_model=schemas.StatusResponse)
async def delete_course(
        course_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin),
):
    async with db.begin():
        exists = await db.execute(select(Course.course_id).where(Course.course_id == course_id))
        if exists.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Course not found")

        page_ids_res = await db.execute(select(CoursePage.page_id).where(CoursePage.course_id == course_id))
        page_ids = [row[0] for row in page_ids_res.all()]
        if page_ids:
            await db.execute(delete(Question).where(Question.course_page_id.in_(page_ids)))

        await db.execute(delete(CourseProgress).where(CourseProgress.course_id == course_id))
        await db.execute(delete(Course).where(Course.course_id == course_id))

    return {"status": "success", "message": f"Course {course_id} deleted."}


@router.post("/courses/{course_id}/pages", status_code=status.HTTP_201_CREATED)
async def create_course_page(
        course_id: str,
        page_type: str = Form(...),
        title: str = Form(""),
        content_markdown: str = Form(""),
        question_json: Optional[str] = Form(None),
        image: Optional[UploadFile] = File(None),
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin),
):
    if page_type not in ("content", "question"):
        raise HTTPException(status_code=400, detail="Invalid page_type.")

    page_id = generate_id()

    async with db.begin():
        course = (await db.execute(select(Course.course_id).where(Course.course_id == course_id))).scalar_one_or_none()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        max_order = (await db.execute(
            select(func.max(CoursePage.order_index)).where(CoursePage.course_id == course_id)
        )).scalar_one_or_none()
        order_index = (max_order + 1) if max_order is not None else 0

        image_path = None
        if image and image.filename:
            image_path = f"{page_id}.webp"
            save_path = os.path.join(settings.UPLOAD_FOLDER, image_path)
            await save_as_webp(image, save_path)

        if page_type == "content":
            db.add(CoursePage(
                page_id=page_id,
                course_id=course_id,
                order_index=order_index,
                page_type="content",
                title=title,
                content_markdown=content_markdown,
                image_path=image_path,
            ))
        else:
            if not question_json:
                raise HTTPException(status_code=400, detail="question_json is required for question pages.")
            try:
                question = schemas.QuestionCreateAndEdit.model_validate_json(question_json)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid question JSON format.")

            db.add(CoursePage(
                page_id=page_id,
                course_id=course_id,
                order_index=order_index,
                page_type="question",
                title=title or None,
            ))

            question_id = generate_id()
            db.add(Question(
                question_id=question_id,
                course_page_id=page_id,
                question_type=question.type,
                question_text=question.question,
                image_path=image_path,
                extra_data=question.extra_data,
                points_value=question.points_value,
            ))
            await save_answers_for_question(
                db=db,
                question_type=question.type,
                question_data=question.model_dump(),
                question_id=question_id,
            )

    return {"status": "success", "message": "Page created successfully!", "page_id": page_id}


@router.put("/courses/{course_id}/pages/{page_id}", response_model=schemas.StatusResponse)
async def update_course_page(
        course_id: str,
        page_id: str,
        title: str = Form(""),
        content_markdown: str = Form(""),
        question_json: Optional[str] = Form(None),
        image: Optional[UploadFile] = File(None),
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin),
):
    async with db.begin():
        page = (await db.execute(
            select(CoursePage).where(CoursePage.page_id == page_id, CoursePage.course_id == course_id)
        )).scalar_one_or_none()
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")

        image_path = page.image_path
        if image and image.filename:
            image_path = f"{page_id}.webp"
            save_path = os.path.join(settings.UPLOAD_FOLDER, image_path)
            await save_as_webp(image, save_path)

        if page.page_type == "content":
            page.title = title
            page.content_markdown = content_markdown
            page.image_path = image_path
        else:
            if not question_json:
                raise HTTPException(status_code=400, detail="question_json is required for question pages.")
            try:
                question = schemas.QuestionCreateAndEdit.model_validate_json(question_json)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid question JSON format.")

            page.title = title or None

            question_row = (await db.execute(
                select(Question).where(Question.course_page_id == page_id)
            )).scalar_one_or_none()

            if question_row:
                question_row.question_type = question.type
                question_row.question_text = question.question
                question_row.image_path = image_path
                question_row.extra_data = question.extra_data
                question_row.points_value = question.points_value
                question_id = question_row.question_id
            else:
                question_id = generate_id()
                db.add(Question(
                    question_id=question_id,
                    course_page_id=page_id,
                    question_type=question.type,
                    question_text=question.question,
                    image_path=image_path,
                    extra_data=question.extra_data,
                    points_value=question.points_value,
                ))

            await save_answers_for_question(
                db=db,
                question_type=question.type,
                question_data=question.model_dump(),
                question_id=question_id,
            )

    return {"status": "success", "message": "Page updated successfully!"}


@router.delete("/courses/{course_id}/pages/{page_id}", response_model=schemas.StatusResponse)
async def delete_course_page(
        course_id: str,
        page_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin),
):
    async with db.begin():
        page = (await db.execute(
            select(CoursePage.page_id).where(CoursePage.page_id == page_id, CoursePage.course_id == course_id)
        )).scalar_one_or_none()
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")

        await db.execute(delete(Question).where(Question.course_page_id == page_id))
        await db.execute(delete(CoursePage).where(CoursePage.page_id == page_id))

    return {"status": "success", "message": "Page deleted successfully!"}


@router.post("/courses/{course_id}/pages/reorder", response_model=schemas.StatusResponse)
async def reorder_course_pages(
        course_id: str,
        order: List[dict] = Body(...),
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin),
):
    async with db.begin():
        for item in order:
            page_id = item.get("page_id")
            order_index = item.get("order_index")
            if page_id is None or order_index is None:
                continue
            await db.execute(
                update(CoursePage)
                .where(CoursePage.page_id == page_id, CoursePage.course_id == course_id)
                .values(order_index=order_index)
            )

    return {"status": "success", "message": "Pages reordered successfully!"}
