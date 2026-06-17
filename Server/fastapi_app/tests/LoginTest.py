import bcrypt
import pytest
from fastapi.testclient import TestClient
from Server.main import app
from fastapi_app.database.database import get_session

hashed_pw = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode()

class FakeUser:
    def __init__(self, login, password_hash):
        self.user_id = "fake_id_1"
        self.login = login
        self.password_hash = password_hash
        self.role = "user"
        self.created_at = "2025-12-26T00:00:00Z"
        self.password_change_required = False

class FakeDB:
    async def execute(self, stmt):
        class FakeResult:
            def scalar_one_or_none(self):
                return FakeUser("user1", hashed_pw)
        return FakeResult()


class FakeConfig:
    def __init__(self, open_mode=True, use_index=True):
        self.open_mode = open_mode
        self.use_index = use_index


@pytest.fixture
def client():
    return TestClient(app)


def test_open_mode_user_creation(client):
    from fastapi_app.routes.users.user_auth import get_dynamic_config
    app.dependency_overrides[get_dynamic_config] = lambda: FakeConfig(open_mode=True, use_index=True)

    data = {
        "name": "Anna",
        "surname": "Nowak",
        "index": 456
    }

    response = client.post("/api/new_user", json=data)
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "success"
    assert json_data["user"]["name"] == "Anna"


def test_closed_mode_login_success(client):
    from fastapi_app.routes.users.user_auth import get_dynamic_config
    app.dependency_overrides[get_dynamic_config] = lambda: FakeConfig(open_mode=False, use_index=True)
    app.dependency_overrides[get_session] = lambda: FakeDB()

    data = {
        "login": "user1",
        "password": "password123"
    }

    response = client.post("/api/new_user", json=data)
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "success"
    assert json_data["user"]["login"] == "user1"
