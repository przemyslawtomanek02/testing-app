from typing import Optional
from fastapi import Request, HTTPException, status, Depends
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..database.database import get_session
from ..schemas import AppConfigFull, AppConfig
from ..database.dbmodels import AppConfig as AppConfigModel

async def get_dynamic_config(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> AppConfigFull:
    """
    Zwraca dynamiczną konfigurację aplikacji.
    Cache'uje wynik w request.state.dynamic_config w ramach jednego requestu.
    """
    if hasattr(request.state, "dynamic_config"):
        return request.state.dynamic_config

    result = await session.execute(select(AppConfigModel).limit(1))
    cfg: Optional[AppConfig] = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuration not found in the database."
        )

    cfg_schema = AppConfigFull.model_validate(cfg)
    request.state.dynamic_config = cfg_schema
    return cfg_schema


def is_admin(request: Request):
    """
    Zależność, która zastępuje dekorator @admin_required.
    Sprawdza, czy w sesji jest zalogowany admin i czy sesja nie wygasła.
    """
    if not request.session.get('is_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator status required"
        )

    last_active_str = request.session.get('admin_last_active')
    if last_active_str:
        last_active = datetime.fromisoformat(last_active_str)

        if last_active.tzinfo is None:
            last_active = last_active.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) - last_active > timedelta(minutes=15):
            request.session.pop('is_admin', None)
            request.session.pop('admin_last_active', None)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please log in again."
            )

    request.session['admin_last_active'] = datetime.now(timezone.utc).isoformat()

    return request.session.get('user_id')