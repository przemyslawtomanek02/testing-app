from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from sqlalchemy import update, select
from sqlalchemy.ext.asyncio import AsyncSession
from .. import schemas
from ..config import settings
from ..database.database import get_session
from ..database.dbmodels import AppConfig
from ..utils.dependencies import is_admin

router = APIRouter(
    prefix="/api",
    tags=["App Configuration"]
)


@router.get("/config", response_model=schemas.AppConfig)
async def get_config_endpoint(session: AsyncSession = Depends(get_session)):
    """Pobiera dynamiczną konfigurację aplikacji z bazy danych."""

    res = await session.execute(select(AppConfig).limit(1))
    cfg = res.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="Configuration not found in database.")
    return cfg


@router.patch("/update_config", response_model=schemas.StatusResponse)
async def update_config_endpoint(
        config_data: schemas.AppConfigUpdate,
        session: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Aktualizuje dynamiczną konfigurację aplikacji w bazie danych."""
    payload = config_data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No configuration data provided.")

    payload["updated_at"] = datetime.now(timezone.utc)

    async with session.begin():
        stmt = (
            update(AppConfig)
            .where(AppConfig.id == 1)
            .values(**payload)
        )
        result = await session.execute(stmt)
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Config row with id=1 not found to update.")

    return {"status": "success", "message": "Configuration updated successfully."}


@router.get("/status")
def get_status():
    return {"status": "ok", "environment": settings.APP_ENV, "date": datetime.now(timezone.utc).isoformat()}
