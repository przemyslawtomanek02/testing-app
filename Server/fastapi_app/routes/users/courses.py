from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ... import schemas
from ...database.database import get_session
from ...database.dbmodels import Course, CoursePage, CourseProgress, Question
from ...utils.helpers import generate_id, build_question_structure
from ...utils.answer_grading import is_answer_correct
from .user_utils import get_user_id_from_session

router = APIRouter(
    prefix="/api",
    tags=["User - Courses"]
)


async def _recompute_is_completed(db: AsyncSession, course_id: str, progress: CourseProgress) -> bool:
    """A course counts as completed once the student has finished its last page:
    answered it correctly if it's a question (answering it IS reaching it — no
    separate position check needed), or navigated to view it if it's content.
    Sticky: never flips back to False just because the student went back to review.
    """
    if progress.is_completed:
        return True

    last_page = (await db.execute(
        select(CoursePage.page_id, CoursePage.order_index, CoursePage.page_type)
        .where(CoursePage.course_id == course_id)
        .order_by(CoursePage.order_index.desc())
        .limit(1)
    )).one_or_none()
    if not last_page:
        return False

    if last_page.page_type == "question":
        return last_page.page_id in (progress.completed_page_ids or [])
    return progress.current_page_index >= last_page.order_index


def _page_to_student_dict(page: CoursePage, completed_page_ids: set) -> dict:
    question = None
    if page.page_type == "question" and page.question:
        built = build_question_structure([page.question], include_admin_fields=False)
        question = built[0] if built else None

    return {
        "page_id": page.page_id,
        "order_index": page.order_index,
        "page_type": page.page_type,
        "title": page.title,
        "content_markdown": page.content_markdown,
        "image": page.image_path,
        "question": question,
        "is_completed": page.page_id in completed_page_ids,
    }


@router.get("/courses", response_model=List[schemas.CourseStudentSummary])
async def get_courses(
        user_id: str = Depends(get_user_id_from_session),
        db: AsyncSession = Depends(get_session),
):
    stmt = (
        select(
            Course.course_id,
            Course.title,
            Course.description,
            Course.cover_image_path,
            func.count(CoursePage.page_id).label("total_pages"),
        )
        .outerjoin(CoursePage, CoursePage.course_id == Course.course_id)
        .where(Course.is_published.is_(True))
        .group_by(Course.course_id, Course.title, Course.description, Course.cover_image_path)
        .order_by(Course.created_at.desc())
    )
    rows = (await db.execute(stmt)).mappings().all()

    progress_stmt = select(CourseProgress).where(CourseProgress.user_id == user_id)
    progress_by_course = {p.course_id: p for p in (await db.execute(progress_stmt)).scalars().all()}

    result = []
    for row in rows:
        progress = progress_by_course.get(row["course_id"])
        result.append({
            **row,
            "current_page_index": progress.current_page_index if progress else 0,
            "is_completed": progress.is_completed if progress else False,
        })
    return result


@router.get("/courses/{course_id}", response_model=schemas.CourseStudentDetail)
async def get_course_detail(
        course_id: str,
        user_id: str = Depends(get_user_id_from_session),
        db: AsyncSession = Depends(get_session),
):
    stmt = (
        select(Course)
        .where(Course.course_id == course_id, Course.is_published.is_(True))
        .options(
            selectinload(Course.pages)
            .selectinload(CoursePage.question)
            .selectinload(Question.answers)
        )
    )
    course = (await db.execute(stmt)).unique().scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    progress = (await db.execute(
        select(CourseProgress).where(CourseProgress.user_id == user_id, CourseProgress.course_id == course_id)
    )).scalar_one_or_none()

    if not progress:
        progress = CourseProgress(
            progress_id=generate_id(),
            user_id=user_id,
            course_id=course_id,
            current_page_index=0,
            completed_page_ids=[],
            page_answers={},
        )
        db.add(progress)
        await db.commit()

    completed_page_ids = set(progress.completed_page_ids or [])
    pages = sorted(course.pages, key=lambda p: p.order_index)

    return {
        "course_id": course.course_id,
        "title": course.title,
        "description": course.description,
        "current_page_index": progress.current_page_index,
        "is_completed": progress.is_completed,
        "pages": [_page_to_student_dict(p, completed_page_ids) for p in pages],
    }


@router.post("/courses/{course_id}/pages/{page_id}/answer", response_model=schemas.CourseAnswerResponse)
async def answer_course_page(
        course_id: str,
        page_id: str,
        payload: schemas.CourseAnswerPayload,
        user_id: str = Depends(get_user_id_from_session),
        db: AsyncSession = Depends(get_session),
):
    page = (await db.execute(
        select(CoursePage).where(CoursePage.page_id == page_id, CoursePage.course_id == course_id)
    )).scalar_one_or_none()
    if not page or page.page_type != "question":
        raise HTTPException(status_code=404, detail="Question page not found.")

    question = (await db.execute(
        select(Question).where(Question.course_page_id == page_id)
    )).scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found for this page.")

    correct = await is_answer_correct(db, question.question_id, question.question_type, payload.user_response)

    progress = (await db.execute(
        select(CourseProgress).where(
            CourseProgress.user_id == user_id, CourseProgress.course_id == course_id
        )
    )).scalar_one_or_none()
    if not progress:
        progress = CourseProgress(
            progress_id=generate_id(),
            user_id=user_id,
            course_id=course_id,
            current_page_index=0,
            completed_page_ids=[],
            page_answers={},
        )
        db.add(progress)

    page_answers = dict(progress.page_answers or {})
    entry = dict(page_answers.get(page_id, {"attempts": 0}))
    entry["attempts"] = entry.get("attempts", 0) + 1
    entry["is_correct"] = correct
    entry["last_response"] = payload.user_response
    page_answers[page_id] = entry
    progress.page_answers = page_answers

    completed_page_ids = list(progress.completed_page_ids or [])
    if correct and page_id not in completed_page_ids:
        completed_page_ids.append(page_id)
        progress.completed_page_ids = completed_page_ids

    # current_page_index reflects the page the reader is actually displaying — it's
    # only ever moved by /progress (called on every navigation), never guessed here.
    progress.is_completed = await _recompute_is_completed(db, course_id, progress)

    await db.commit()

    return {"is_correct": correct, "attempts": entry["attempts"], "current_page_index": progress.current_page_index}


@router.post("/courses/{course_id}/progress", response_model=schemas.StatusResponse)
async def update_course_progress(
        course_id: str,
        payload: schemas.CourseProgressUpdate,
        user_id: str = Depends(get_user_id_from_session),
        db: AsyncSession = Depends(get_session),
):
    async with db.begin():
        progress = (await db.execute(
            select(CourseProgress).where(
                CourseProgress.user_id == user_id, CourseProgress.course_id == course_id
            ).with_for_update()
        )).scalar_one_or_none()
        if not progress:
            progress = CourseProgress(
                progress_id=generate_id(),
                user_id=user_id,
                course_id=course_id,
                completed_page_ids=[],
                page_answers={},
            )
            db.add(progress)
        progress.current_page_index = payload.current_page_index
        progress.is_completed = await _recompute_is_completed(db, course_id, progress)

    return {"status": "success", "message": "Progress saved."}
