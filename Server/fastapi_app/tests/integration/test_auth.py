import pytest
from sqlalchemy import select
from fastapi_app.database.dbmodels import AppConfig, User
from fastapi_app.utils.security import hash_password
from fastapi_app.utils.helpers import generate_id

@pytest.mark.asyncio
async def test_guest_login_open_mode(client, async_session):
    config = AppConfig(id=1, open_mode=True, use_index=True, dark_mode=False)
    async_session.add(config)
    await async_session.commit()

    response = await client.post("/api/new_user", json={
        "name": "John",
        "surname": "Doe",
        "index": 12345
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["user"]["name"] == "John"

@pytest.mark.asyncio
async def test_user_login_closed_mode(client, async_session):
    # Setup Closed Mode
    config = AppConfig(id=1, open_mode=False, use_index=True, dark_mode=False)
    async_session.add(config)
    
    # Create User
    pwd_hash = hash_password("secret123")
    user = User(
        user_id=generate_id(),
        login="activeuser",
        password_hash=pwd_hash,
        name="Active",
        surname="User",
        role="user",
        password_change_required=False
    )
    async_session.add(user)
    await async_session.commit()

    # Attempt Login
    response = await client.post("/api/new_user", json={
        "login": "activeuser",
        "password": "secret123"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["user"]["login"] == "activeuser"

@pytest.mark.asyncio
async def test_login_invalid_credentials(client, async_session):
    config = AppConfig(id=1, open_mode=False, use_index=True, dark_mode=False)
    async_session.add(config)
    await async_session.commit()

    response = await client.post("/api/new_user", json={
        "login": "nonexistent",
        "password": "password"
    })
    
    assert response.status_code == 401
