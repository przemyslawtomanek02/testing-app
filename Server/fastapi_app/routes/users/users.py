from fastapi import APIRouter, Depends, HTTPException, Request
import aiosqlite
from typing import List, Union

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ... import schemas
from ...database.database import get_session
from ...database.dbmodels import TestInstance, Test, UserActivity, Question
from ...utils.dependencies import get_dynamic_config
from ...utils.helpers import generate_id
from . import user_utils

router = APIRouter(
    prefix="/api",
    tags=["User - Tests"]
)


@router.get("/get_instances", response_model=List[schemas.InstanceInfo])
async def get_instances(db: AsyncSession = Depends(get_session)):
    """Pobiera wszystkie aktywne instancje testów."""

    stmt = (
        select(
            TestInstance.instance_id,
            TestInstance.test_id,
            TestInstance.is_active,
            TestInstance.test_time,
            TestInstance.instance_name,
            TestInstance.num_questions,
        )
        .join(Test, Test.test_id == TestInstance.test_id)
        .where(TestInstance.is_active == True)
    )

    result = await db.execute(stmt)
    return result.mappings().all()


@router.post("/start_instance/{ulid_id}", response_model=Union[schemas.TestStartResponse, schemas.RedirectToResultsResponse])
async def start_instance(
        ulid_id: str,
        request: Request,
        db: AsyncSession = Depends(get_session),
        dynamic_config: schemas.AppConfigFull = Depends(get_dynamic_config)
):
    """Rozpoczyna lub wznawia test dla użytkownika."""
    user_id = request.session.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required. Please create a user session first.")

    participation_status = await user_utils.check_user_participation(db, user_id, ulid_id)

    if participation_status == "no_record":
        return await user_utils.user_new_instance_activity(request, db, user_id, ulid_id, dynamic_config)
    elif participation_status == "resume_test":
        return await user_utils.resume_test(request, db, user_id, ulid_id)
    elif participation_status == "test_finished":
        return await user_utils.block_test(request, db, user_id, ulid_id)
    else:
        raise HTTPException(status_code=500, detail="Unexpected participation status.")


@router.post("/user_answer", response_model=schemas.AnswerSubmissionResponse)
async def user_answer(
        request: Request,
        answer_data: schemas.UserAnswerPayload,
        db: AsyncSession = Depends(get_session),
):
    """Zapisuje odpowiedź użytkownika na pytanie."""

    activity_id = request.session.get('activity_id')
    if not activity_id:
        raise HTTPException(status_code=403, detail="No activity found in session.")

    try:
        activity_stmt = select(UserActivity).where(UserActivity.activity_id == activity_id)
        activity = (await db.execute(activity_stmt)).scalar_one_or_none()

        if not activity:
            raise HTTPException(status_code=404, detail="User activity not found.")

        if activity.is_finished:
            raise HTTPException(status_code=400, detail="Test has already been finished.")

        if activity.instance_id != answer_data.test_instance_id:
            raise HTTPException(status_code=400, detail="Answer does not match active test instance.")

        instance_stmt = (
            select(TestInstance)
            .options(selectinload(TestInstance.test))
            .where(TestInstance.instance_id == activity.instance_id)
        )
        instance = (await db.execute(instance_stmt)).scalar_one_or_none()

        if not instance or not instance.test:
            raise HTTPException(status_code=404, detail="Test instance not found.")

        test_id = instance.test.test_id
        question_stmt = select(Question.question_id).where(
            Question.question_id == answer_data.question_id,
            Question.test_id == test_id,
            Question.is_active == True
        )
        question_exists = (await db.execute(question_stmt)).scalar_one_or_none()
        if not question_exists:
            raise HTTPException(status_code=400, detail="Question does not belong to active test instance.")

        points_collected = await user_utils.calculate_points(db, answer_data)

        await user_utils.save_result(
            db=db,
            result_id=generate_id(),
            answer_data=answer_data,
            test_id=test_id,
            activity_id=activity_id,
            points_collected=points_collected,
        )

        await user_utils.update_user_activity(
            db=db,
            activity_id=activity_id,
        )

        await db.commit()


    except HTTPException:
        await db.rollback()
        raise

    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save answer.")

    return {"status": "success", "points_collected": points_collected}


# todo response model
@router.post("/end_user_activity", response_model=List[schemas.QuestionResult])
async def end_user_activity(request: Request, db: AsyncSession = Depends(get_session)):
    """Kończy test użytkownika i zwraca sformatowane wyniki."""

    activity_id = request.session.get('activity_id')
    if not activity_id:
        raise HTTPException(status_code=403, detail="No activity found in session.")

    try:
        await user_utils.fill_missing_results(db, activity_id)
        await db.execute(
            update(UserActivity)
            .where(UserActivity.activity_id == activity_id)
            .values(is_finished=True)
        )
        await db.commit()

    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to finalize user activity.")

    formatted_results = await user_utils.get_formatted_results(db, activity_id)
    request.session.pop("activity_id", None)

    return formatted_results


@router.post("/user_results", response_model=List[schemas.QuestionResult])
async def user_results(
        request: Request,
        db: AsyncSession = Depends(get_session)
):
    """Pobiera wyniki ostatnio zakończonego testu z sesji."""

    activity_id = request.session.get('activity_id')

    if not activity_id:
        raise HTTPException(status_code=403, detail="No activity found in session.")

    return await user_utils.get_formatted_results(db, activity_id)


@router.post("/clear_activity_session", response_model=schemas.StatusResponse)
async def clear_activity_session(request: Request):
    """Usuwa activity_id z sesji."""
    request.session.pop('activity_id', None)
    return {"status": "success", "message": "Activity session cleared."}
