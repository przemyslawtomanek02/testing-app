from fastapi import APIRouter, Depends, HTTPException, Request, status
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ... import schemas
from ...database.database import get_session
from ...database.dbmodels import User
from ...utils.dependencies import is_admin
from ...utils.security import verify_password

router = APIRouter(
    tags=["Admin - Authentication"]
)


@router.get("/api/check_admin_status", response_model=schemas.AdminStatus)
async def check_admin_status(
        request: Request,
        db: AsyncSession = Depends(get_session),
        is_user_admin: str = Depends(is_admin)):
    """
    Sprawdza status admina w bieżącej sesji, używając zależności.
    """

    stmt = await db.execute(select(User).where(User.user_id == is_user_admin))
    admin = stmt.scalar_one_or_none()

    if not admin or admin.role != "admin":
        return {"is_admin": False}

    return {"is_admin": True}


@router.post("/api/admin_login", response_model=schemas.AdminLoginResponse)
async def login(
        request: Request,
        admin_data: schemas.LoginCredentials,
        db: AsyncSession = Depends(get_session)
):
    """Loguje administratora i tworzy sesję."""

    res = await db.execute(select(User).where(User.login == admin_data.login))
    admin = res.scalar_one_or_none()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    if not str(admin.role) == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not an admin."
        )

    if not admin or not verify_password(admin_data.password, str(admin.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    request.session['is_admin'] = True
    request.session['user_id'] = admin.user_id
    request.session['name'] = admin.name
    request.session['surname'] = admin.surname
    request.session['index'] = admin.user_index
    request.session['email'] = admin.email
    request.session['admin_last_active'] = datetime.now(timezone.utc).isoformat()

    return {"redirect": True, "admin": admin}


@router.post("/api/logout", response_model=schemas.RedirectResponse)
async def logout(request: Request):
    """Wylogowuje użytkownika przez wyczyszczenie całej sesji."""
    request.session.clear()
    return {"redirect": True}
