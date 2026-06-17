import logging
from pathlib import Path
import aiofiles.os
from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ... import schemas
from ...config import settings
from ...database.database import get_session
from ...database.dbmodels import User
from ...utils.dependencies import is_admin
from ...utils.helpers import generate_id, save_as_webp
from ...utils.security import hash_password

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Users (Profiles) Management"]
)


@router.get("/get_profiles", response_model=List[schemas.UserView])
async def get_all_users(
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Pobiera listę wszystkich zarejestrowanych użytkowników."""

    stmt = (
        select(
            User.user_id,
            User.login,
            User.role,
            User.name,
            User.surname,
            User.email,
            User.user_index,
            User.avatar_path,
            User.created_at
        )
        .order_by(User.surname, User.name)
    )

    result = await db.execute(stmt)
    users = result.mappings().all()
    return users


@router.post("/create_profile", response_model=schemas.UserView, status_code=status.HTTP_201_CREATED)
async def create_new_user(
        login: str = Form(...),
        password: str = Form(...),
        role: str = Form(...),
        name: Optional[str] = Form(None),
        surname: Optional[str] = Form(None),
        user_index: Optional[int] = Form(None),
        email: Optional[str] = Form(None),
        avatar_file: Optional[UploadFile] = File(None),
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Tworzy nowego użytkownika na podstawie danych z formularza, włączając w to awatar."""
    res = await db.execute(select(User).where(User.login == login))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"User with login '{login}' already exists.")

    user_id = generate_id()
    hashed_password = hash_password(password)

    avatar_filename: Optional[str] = None
    if avatar_file and avatar_file.filename:
        try:
            avatar_filename = f"{user_id}.webp"
            save_path = Path(settings.AVATARS_FOLDER) / avatar_filename
            await save_as_webp(avatar_file, save_path)
        except Exception as e:
            import logging
            logging.error(f"Błąd zapisu awatara dla {user_id}: {e}")
            avatar_filename = None

    new_user = User(
        user_id=user_id,
        login=login,
        password_hash=hashed_password,
        role=role,
        name=name,
        surname=surname,
        user_index=int(user_index) if user_index is not None else None,
        email=email,
        avatar_path=avatar_filename,
    )
    db.add(new_user)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Login lub e-mail już istnieje.")
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Błąd bazy podczas tworzenia użytkownika.")

    await db.refresh(new_user)
    return new_user


@router.put("/update_profile/{user_id}", response_model=schemas.UserView)
async def update_user_profile(
        user_id: str,
        login: str = Form(...),
        name: Optional[str] = Form(None),
        surname: Optional[str] = Form(None),
        user_index: Optional[int] = Form(None),
        email: Optional[str] = Form(None),
        password: Optional[str] = Form(None),
        avatar_file: Optional[UploadFile] = File(None),
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Aktualizuje profil istniejącego użytkownika."""

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony.")

    if user.login != login:
        existing_user_res = await db.execute(select(User).where(User.login == login))
        if existing_user_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Użytkownik z loginem '{login}' już istnieje.")
        user.login = login

    if name is not None:
        user.name = name
    if surname is not None:
        user.surname = surname
    if user_index is not None:
        user.user_index = user_index
    if email is not None:
        user.email = email
    if password:
        user.password_hash = hash_password(password)

    if avatar_file and avatar_file.filename:
        filename = f"{user_id}.webp"
        save_path = Path(settings.AVATARS_FOLDER) / filename
        await save_as_webp(avatar_file, save_path)
        user.avatar_path = filename

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/delete_profile/{user_id}", response_model=schemas.StatusResponse)
async def delete_user_profile(
        user_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Usuwa profil użytkownika oraz powiązany z nim plik awatara."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony.")

    avatar_filename = user.avatar_path

    try:
        await db.delete(user)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Nie można usunąć użytkownika – istnieją powiązane dane (np. historia)."
        )

    if avatar_filename:
        try:
            full_photo_path = Path(settings.AVATARS_FOLDER) / avatar_filename
            if full_photo_path.is_file():
                await aiofiles.os.remove(full_photo_path)
        except Exception as e:
            logging.error(f"Błąd podczas usuwania pliku awatara {avatar_filename}: {e}")

    return {"status": "success", "message": "Profil usunięty."}


@router.post("/force_password_reset/{user_id}", status_code=status.HTTP_200_OK)
async def force_user_password_reset(
        user_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Wymusza na użytkowniku zmianę hasła przy następnym logowaniu."""

    result = await db.execute(select(User).where(User.user_id == user_id))
    user_to_update = result.scalar_one_or_none()

    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")

    user_to_update.password_change_required = True

    await db.commit()

    return {"message": "Password reset has been successfully forced for the user."}
