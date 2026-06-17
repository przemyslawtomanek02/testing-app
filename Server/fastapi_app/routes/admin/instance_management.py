import json
from datetime import datetime, timezone
import random
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ... import schemas
from ...database.database import get_session
from ...database.dbmodels import TestInstance, Question, GradingScheme
from ...utils.dependencies import is_admin
from ...utils.helpers import generate_id

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Instance Management"]
)


@router.get("/get_admin_instances", response_model=List[schemas.InstanceDetail])
async def get_admin_instances(
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin),
):
    """Pobiera wszystkie instancje testów wraz z nazwami testów."""

    stmt = (
        select(TestInstance)
        .options(selectinload(TestInstance.test))
        .order_by(TestInstance.created_at.desc())
    )

    result = await db.execute(stmt)
    instances = result.scalars().all()

    return [
        schemas.InstanceDetail(
            instance_id=i.instance_id,
            test_id=i.test_id,
            is_active=i.is_active,
            start_time=i.start_time.isoformat() if i.start_time else None,
            end_time=i.end_time.isoformat() if i.end_time else None,
            test_time=i.test_time,
            instance_name=i.instance_name,
            num_questions=i.num_questions,
            use_fixed_question_pool=i.use_fixed_question_pool,
            test_name=i.test.name
        )
        for i in instances
    ]


@router.post("/create_instance", response_model=schemas.StatusResponse, status_code=status.HTTP_201_CREATED)
async def create_instance(
        instance_data: schemas.InstanceCreate,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Tworzy nową instancję testu."""

    fixed_ids_json = None
    now_naive_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    if instance_data.use_fixed_question_pool:
        q_stmt = select(Question.question_id).where(
            Question.test_id == instance_data.test_id,
            Question.is_active == True
        )
        q_res = await db.execute(q_stmt)
        all_q_ids = [row[0] for row in q_res.all()]

        if len(all_q_ids) > instance_data.num_questions:
            sampled_ids = random.sample(all_q_ids, instance_data.num_questions)
        else:
            sampled_ids = all_q_ids

        fixed_ids_json = sampled_ids

        print(json.dumps(fixed_ids_json))
        print(fixed_ids_json)

    obj = TestInstance(
        instance_id=generate_id(),
        test_id=instance_data.test_id,
        scheme_id=instance_data.scheme_id,
        is_active=instance_data.is_active,
        start_time=now_naive_utc if instance_data.is_active else None,
        end_time=None,
        test_time=instance_data.test_time,
        instance_name=instance_data.instance_name,
        num_questions=instance_data.num_questions,
        use_fixed_question_pool=instance_data.use_fixed_question_pool,
        fixed_question_ids=fixed_ids_json,
    )

    db.add(obj)
    await db.commit()
    return {"status": "success", "message": f"Instance successfully created. ID: {obj.instance_id}"}


@router.get("/getGradingForInstanceCreate", response_model=List[schemas.GradingForInstanceCreate])
async def get_grading_for_test_instance(
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Pobiera listę wszystkich dostępnych schematów oceniania."""

    stmt = select(GradingScheme.scheme_id, GradingScheme.name).order_by(GradingScheme.name)
    res = await db.execute(stmt)

    return res.mappings().all()


@router.post("/switch_instance_status/{ulid_id}", response_model=schemas.StatusResponse)
async def switch_instance_status(
        ulid_id: str,
        status_update: schemas.InstanceStatusUpdate,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    res = await db.execute(select(TestInstance).where(TestInstance.instance_id == ulid_id))
    inst = res.scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")

    if status_update.is_active:
        if inst.start_time is not None:
            inst.end_time = None
            inst.is_active = True
        else:
            inst.start_time = now
            inst.is_active = True
    else:
        inst.end_time = now
        inst.is_active = False

    await db.commit()
    return {"status": "success", "message": "Instance status successfully updated."}


@router.delete("/delete_instance/{ulid_id}", response_model=schemas.StatusResponse)
async def delete_instance(
        ulid_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    res = await db.execute(select(TestInstance).where(TestInstance.instance_id == ulid_id))
    inst = res.scalars().first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")

    await db.delete(inst)
    await db.commit()
    return {"status": "success", "message": f"Instancja o ID {ulid_id} została usunięta."}
