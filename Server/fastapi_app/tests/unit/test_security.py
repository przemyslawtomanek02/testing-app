from fastapi_app.utils.security import hash_password, verify_password

def test_hash_password():
    pwd = "mysecretpassword"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert isinstance(hashed, str)
    assert len(hashed) > 0

def test_verify_password_success():
    pwd = "password123"
    hashed = hash_password(pwd)
    assert verify_password(pwd, hashed) is True

def test_verify_password_failure():
    pwd = "password123"
    hashed = hash_password(pwd)
    assert verify_password("wrongpassword", hashed) is False
