from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ... import schemas
from ...database.database import get_session
from ...database.dbmodels import GradingScheme, GradingThreshold
from ...utils.dependencies import is_admin
from ...utils.helpers import generate_id

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Grading Schemes"]
)


@router.get("/list_grading_schemes", response_model=List[schemas.GradingScheme])
async def list_grading_schemes(
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Pobiera listę wszystkich schematów oceniania."""
    res = await db.execute(select(GradingScheme).order_by(GradingScheme.scheme_id))
    items = res.scalars().all()
    return items


@router.get("/get_grading_scheme/{scheme_id}", response_model=schemas.GradingSchemeDetail)
async def get_grading_scheme(
        scheme_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Pobiera szczegółowe dane jednego schematu oceniania wraz z progami."""

    stmt = (
        select(GradingScheme)
        .options(selectinload(GradingScheme.thresholds))
        .where(GradingScheme.scheme_id == scheme_id)
        .limit(1)
    )
    res = await db.execute(stmt)
    scheme = res.scalar_one_or_none()
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    return scheme


@router.post("/create_grading_scheme", response_model=schemas.GradingScheme, status_code=status.HTTP_201_CREATED)
async def create_grading_scheme(
        scheme_data: schemas.GradingSchemeCreate,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Tworzy nowy schemat oceniania i jego progi."""

    payload = scheme_data.model_dump(exclude={"grading_thresholds"})
    new_scheme = GradingScheme(
        scheme_id=generate_id(),
        **payload,
    )
    db.add(new_scheme)

    for thr in scheme_data.grading_thresholds:
        db.add(
            GradingThreshold(
                threshold_id=generate_id(),
                scheme_id=new_scheme.scheme_id,
                percentage_min=thr.percentage_min,
                percentage_max=thr.percentage_max,
                grade=thr.grade,
            )
        )

    await db.commit()
    await db.refresh(new_scheme)
    return new_scheme


@router.put("/update_grading_scheme/{scheme_id}", response_model=schemas.GradingScheme)
async def update_grading_scheme(
        scheme_id: str,
        scheme_data: schemas.GradingSchemeCreate,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Aktualizuje istniejący schemat oceniania."""

    res = await db.execute(select(GradingScheme).where(GradingScheme.scheme_id == scheme_id))
    scheme = res.scalars().first()
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")

    payload = scheme_data.model_dump(exclude={"grading_thresholds"})
    for key, value in payload.items():
        setattr(scheme, key, value)

    await db.execute(delete(GradingThreshold).where(GradingThreshold.scheme_id == scheme_id))
    for thr in scheme_data.grading_thresholds:
        db.add(
            GradingThreshold(
                threshold_id=generate_id(),
                scheme_id=scheme_id,
                percentage_min=thr.percentage_min,
                percentage_max=thr.percentage_max,
                grade=thr.grade,
            )
        )

    await db.commit()
    await db.refresh(scheme)
    return scheme


@router.delete("/delete_grading_scheme/{scheme_id}", response_model=schemas.StatusResponse)
async def delete_grading_scheme(
        scheme_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Usuwa schemat oceniania i jego progi."""

    res = await db.execute(select(GradingScheme).where(GradingScheme.scheme_id == scheme_id))
    obj = res.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Scheme not found")

    await db.execute(delete(GradingThreshold).where(GradingThreshold.scheme_id == scheme_id))

    await db.delete(obj)
    await db.commit()
    return {"status": "success", "message": "Grading scheme deleted successfully."}
