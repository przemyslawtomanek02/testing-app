import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from Server.main import app
from fastapi_app.database.dbmodels import Base
from fastapi_app.database.database import get_session

from fastapi_app.config import settings

# Use in-memory SQLite for tests to ensure complete isolation
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest_asyncio.fixture(scope="function", autouse=True)
async def disable_lifespan_and_deps():
    """
    Overrides app lifespan to avoid running main.py startup (init_models, scheduler).
    """
    from contextlib import asynccontextmanager
    from unittest.mock import AsyncMock
    from Server.main import app
    from fastapi_app.database import database
    
    original_lifespan = app.router.lifespan_context
    
    @asynccontextmanager
    async def noop_lifespan(app):
        yield
        
    app.router.lifespan_context = noop_lifespan
    database.init_models = AsyncMock()
    database.dispose_engine = AsyncMock()

    yield

    app.router.lifespan_context = original_lifespan

@pytest_asyncio.fixture(scope="function")
async def async_session():
    """
    Create tables and provide a fresh database session for each test.
    """
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Provide session
    async with TestingSessionLocal() as session:
        yield session
    
    # Drop all tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def client(async_session):
    async def override_get_session():
        yield async_session

    app.dependency_overrides[get_session] = override_get_session
    
    # Create AsyncClient
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()
