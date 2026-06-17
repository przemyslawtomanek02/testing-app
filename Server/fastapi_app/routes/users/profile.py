import logging
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from typing import List, Union

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette import status

from .user_utils import get_current_db_user_from_session, get_user_id_from_session, get_formatted_results
from ... import schemas
from ...config import settings
from ...database.database import get_session
from ...database.dbmodels import User, UserActivity
from ...schemas import AppConfigFull
from ...utils.dependencies import get_dynamic_config
from ...utils.helpers import save_as_webp
from ...utils.security import verify_password, hash_password

router = APIRouter(
    prefix="/api/user",
    tags=["User - Profile & Settings"]
)


@router.get("/profile", response_model=schemas.UserProfile)
async def get_user_profile(
        request: Request,
        db: AsyncSession = Depends(get_session)
):
    """Pobiera dane profilowe zalogowanego użytkownika."""
    user_id = request.session.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail="Brak sesji użytkownika.")

    stmt = select(User).where(User.user_id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        return schemas.UserProfile(
            name=user.name,
            surname=user.surname,
            index=user.user_index,
            email=user.email
        )
    else:
        return {
            "name": request.session.get("name"),
            "surname": request.session.get("surname"),
            "index": request.session.get("index"),
            "email": None
        }


@router.patch("/profile/update", response_model=schemas.UserProfile)
async def update_user_profile(
        request: Request,
        profile_data: schemas.UserProfile,
        user_id: str = Depends(get_user_id_from_session),
        db: AsyncSession = Depends(get_session)
):
    """Aktualizuje dane profilowe użytkownika (na razie tylko email)."""

    update_data = profile_data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="Brak danych do aktualizacji.")

    stmt = (
        update(User)
        .where(User.user_id == user_id)
        .values(**update_data)
        .execution_options(synchronize_session="fetch")
    )
    await db.execute(stmt)
    await db.commit()

    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    return schemas.UserProfile(
        name=user.name,
        surname=user.surname,
        index=user.user_index,
        email=user.email
    )


@router.post("/change_password", response_model=schemas.StatusResponse)
async def change_password(
        password_data: schemas.PasswordChange,
        user_id: str = Depends(get_user_id_from_session),
        db: AsyncSession = Depends(get_session),
):
    """Zmienia hasło zalogowanego użytkownika."""

    stmt = select(User).where(User.user_id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony.")

    if not verify_password(password_data.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Stare hasło jest nieprawidłowe.")

    new_hashed = hash_password(password_data.new_password)

    await db.execute(
        update(User)
        .where(User.user_id == user_id)
        .values(password_hash=new_hashed)
        .execution_options(synchronize_session="fetch")
    )
    await db.commit()

    return {"status": "success", "message": "Hasło zostało zmienione."}


@router.get("/history", response_model=List[schemas.UserHistoryInstance])
async def get_user_history(
        request: Request,
        db: AsyncSession = Depends(get_session),
):
    """Pobiera historię wszystkich podejść do testów dla bieżącego użytkownika."""

    user_id = request.session.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail="User session not found.")

    stmt = (
        select(UserActivity)
        .options(selectinload(UserActivity.test_instance))
        .where(UserActivity.user_id == user_id)
        .order_by(UserActivity.timestamp.desc())
    )

    result = await db.execute(stmt)
    activities = result.scalars().all()

    return [
        schemas.UserHistoryInstance(
            activity_id=ua.activity_id,
            user_id=ua.user_id,
            instance_id=ua.instance_id,
            instance_name=ua.test_instance.instance_name if ua.test_instance else "",
            score=ua.score,
            max_score=ua.max_score,
            is_finished=ua.is_finished,
            timestamp=ua.timestamp,
        )
        for ua in activities
    ]


@router.put("/profile/avatar", response_model=schemas.UserView)
async def upload_avatar(
        file: UploadFile = File(..., alias="avatar_file"),
        current_user: dict = Depends(get_current_db_user_from_session),
        db: AsyncSession = Depends(get_session)
):
    """Przesyła, konwertuje i aktualizuje awatar użytkownika."""
    user_id = current_user['user_id']

    file_content = await file.read()
    if len(file_content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Plik jest za duży. Maksymalny rozmiar to 2MB.")
    await file.seek(0)

    if current_user.get('avatar_path'):
        old_path = Path(settings.AVATARS_FOLDER) / current_user['avatar_path']
        if old_path.is_file():
            old_path.unlink()

    new_filename = f"{user_id}.webp"
    save_path = Path(settings.AVATARS_FOLDER) / new_filename

    await save_as_webp(file, save_path)

    stmt = (
        update(User)
        .where(User.user_id == user_id)
        .values(avatar_path=new_filename)
        .execution_options(synchronize_session="fetch")
    )
    await db.execute(stmt)
    await db.commit()

    result = await db.execute(select(User).where(User.user_id == user_id))
    updated_user = result.scalar_one_or_none()

    if not updated_user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony.")

    return schemas.UserView.model_validate(updated_user)


@router.get("/profile/me", response_model=Union[schemas.UserView, schemas.UserProfile],
            response_model_exclude_none=True)
async def get_my_profile(request: Request,
                         db: AsyncSession = Depends(get_session),
                         cfg: AppConfigFull = Depends(get_dynamic_config)):
    """Pobiera dane profilowe aktualnie zalogowanego użytkownika."""

    if cfg.open_mode:
        profile = schemas.UserProfile(
            name=request.session.get("name"),
            surname=request.session.get("surname"),
            index=request.session.get("index"),
            email=request.session.get("email"),
        )
        return profile

    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User session not found.")

    stmt = select(User).where(User.user_id == user_id).limit(1)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    logging.info(f"get_my_profile: {schemas.UserView.model_validate(user).model_dump()}")
    return schemas.UserView.model_validate(user, from_attributes=True)



@router.get("/results/{activity_id}", response_model=List[schemas.QuestionResult])
async def get_results_by_activity(
        activity_id: str,
        user_id: str = Depends(get_user_id_from_session),
        db: AsyncSession = Depends(get_session),
):
    stmt = select(UserActivity).where(
        UserActivity.activity_id == activity_id,
        UserActivity.user_id == user_id
    )
    result = await db.execute(stmt)
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found for current user.")

    return await get_formatted_results(db, activity_id)
