from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from .dbmodels import Base, User, AppConfig
from ..utils.helpers import generate_id
from ..utils.security import hash_password

DATABASE_URL = (
    f"postgresql+asyncpg://electronapp:electronapp@localhost:5432/electronapp"
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — daje jedną sesję na request."""
    async with AsyncSessionLocal() as session:
        yield session


@asynccontextmanager
async def session_context():
    """Użyteczne w zadaniach w tle / skryptach."""
    async with AsyncSessionLocal() as session:
        yield session


async def init_models() -> None:
    """Tworzy tabele i inicjalizuje domyślne dane."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        stmt = await session.execute(
            select(User).where(User.role == "admin")
        )
        admin_exists = stmt.scalars().first()

        if not admin_exists:
            admin_user = User(
                user_id=generate_id(),
                login="admin",
                password_hash=hash_password("admin"),
                role="admin",
            )
            session.add(admin_user)
            await session.commit()

    async with AsyncSessionLocal() as session:
        stmt = await session.execute(select(AppConfig))
        config_exists = stmt.scalar_one_or_none()

        if not config_exists:
            config = AppConfig(
                id=1,
                dark_mode=False,
                open_mode=True,
                use_index=True,
            )
            session.add(config)
            await session.commit()


async def dispose_engine() -> None:
    """Grzeczne zamknięcie połączeń przy shutdown."""
    await engine.dispose()
