import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from datetime import datetime, timedelta, timezone
from fastapi_app.utils.dependencies import is_admin

def test_is_admin_success():
    request = MagicMock()
    request.session = {
        'is_admin': True,
        'admin_last_active': datetime.now(timezone.utc).isoformat(),
        'user_id': 'admin_1'
    }
    
    user_id = is_admin(request)

    assert user_id == 'admin_1'
    assert request.session['admin_last_active'] is not None

def test_is_admin_not_logged_in():
    request = MagicMock()
    request.session = {}
    
    with pytest.raises(HTTPException) as excinfo:
        is_admin(request)
    assert excinfo.value.status_code == 403

def test_is_admin_session_expired():
    expired_time = (datetime.now(timezone.utc) - timedelta(minutes=20)).isoformat()
    request = MagicMock()
    request.session = {
        'is_admin': True,
        'admin_last_active': expired_time,
        'user_id': 'admin_1'
    }
    
    with pytest.raises(HTTPException) as excinfo:
        is_admin(request)
    assert excinfo.value.status_code == 401
    assert 'is_admin' not in request.session
