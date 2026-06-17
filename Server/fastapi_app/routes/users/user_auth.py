from fastapi import APIRouter, Depends, HTTPException, Request, Body
from typing import Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ... import schemas
from ...database.database import get_session
from ...database.dbmodels import User
from ...schemas import NewPasswordSchema
from ...utils.dependencies import get_dynamic_config
from ...utils.helpers import generate_id
from ...utils.security import verify_password, hash_password

router = APIRouter(
    prefix="/api",
    tags=["User - Authentication & Session"]
)


@router.post("/new_user", response_model=Dict[str, Any])
async def new_user(
        request: Request,
        db: AsyncSession = Depends(get_session),
        data: Dict[str, Any] = Body(...),
        dynamic_config: schemas.AppConfigFull = Depends(get_dynamic_config)
):
    """
    Tworzy nową sesję użytkownika. Działa w dwóch trybach (open/closed)
    w zależności od konfiguracji serwera.
    """
    # --- Tryb Otwarty (OPEN_MODE = True) ---
    if dynamic_config.open_mode:
        try:
            user_data = schemas.UserCreateOpen.model_validate(data)
        except Exception:
            raise HTTPException(status_code=400, detail="Missing fields")

        if dynamic_config.use_index and not user_data.index:
            raise HTTPException(status_code=400, detail="Index is required")

        request.session['user_id'] = generate_id()
        request.session['name'] = user_data.name
        request.session['surname'] = user_data.surname
        request.session['index'] = user_data.index if dynamic_config.use_index else None

        return {"status": "success", "message": "Guest session created successfully.", "user": user_data}

    # --- Tryb Zamknięty (OPEN_MODE = False) ---
    else:
        try:
            user_data = schemas.LoginCredentials.model_validate(data)
        except Exception:
            raise HTTPException(status_code=400, detail="Missing fields: login and password are required")

        stmt = select(User).where(User.login == user_data.login)
        result = await db.execute(stmt)
        user_row = result.scalar_one_or_none()

        if not user_row or not verify_password(user_data.password, str(user_row.password_hash)):
            raise HTTPException(status_code=401, detail="Invalid login or password.")


        if bool(user_row.password_change_required):
            request.session['user_id_pending_password_change'] = user_row.user_id
            return {"action": "FORCE_PASSWORD_CHANGE"}

        user_to_return = schemas.UserView.model_validate(user_row)

        request.session['user_id'] = user_to_return.user_id
        request.session['name'] = user_to_return.name
        request.session['surname'] = user_to_return.surname
        request.session['index'] = user_to_return.user_index if dynamic_config.use_index else None
        request.session['email'] = user_to_return.email

        return {"status": "success", "message": "Logged in successfully.", "user": user_to_return}


@router.post("/set_initial_password", response_model=schemas.StatusResponse)
async def set_initial_password(
        request: Request,
        password_data: NewPasswordSchema,
        db: AsyncSession = Depends(get_session),
):
    """Ustawia nowe hasło dla użytkownika i w pełni go loguje."""

    user_id = request.session.get('user_id_pending_password_change')
    if not user_id:
        raise HTTPException(status_code=403, detail="Brak autoryzacji do wykonania tej operacji.")

    stmt = select(User).where(User.user_id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=403, detail="Użytkownik nie istnieje.")

    user.password_hash = hash_password(password_data.new_password)
    user.password_change_required = False
    await db.commit()

    request.session['user_id'] = user.user_id
    request.session['name'] = user.name
    request.session['surname'] = user.surname
    request.session['index'] = user.user_index
    request.session['email'] = user.email

    request.session.pop('user_id_pending_password_change', None)

    return {"status": "success", "message": "Hasło zostało zmienione. Zalogowano pomyślnie."}


@router.get("/user/session_check", response_model=schemas.StatusResponse)
async def check_user_session(request: Request):
    """
    Sprawdza, czy sesja użytkownika (gościa lub zalogowanego) jest aktywna.
    """
    if request.session.get('user_id') and request.session.get('name'):
        return {"status": "success", "message": "Sesja jest aktywna"}
    else:
        raise HTTPException(status_code=401, detail="Missing session data. Please log in or create a new session.")


@router.post("/user/logout", response_model=schemas.StatusResponse)
async def user_logout(request: Request):
    """Wylogowuje użytkownika (czyści jego sesję)."""

    is_admin = request.session.get('is_admin', False)
    user_id = request.session.get('user_id')
    last_active = request.session.get('admin_last_active')

    request.session.clear()

    if is_admin:
        request.session['is_admin'] = is_admin
        request.session['user_id'] = user_id
        request.session['admin_last_active'] = last_active

    return {"status": "success", "message": "Logged out successfully."}
