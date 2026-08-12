import re
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.models.user import User
from tests.conftest import TestingSessionLocal

CODE_RE = re.compile(r"^\d{6}$")


def _register_and_capture_code(client, email="new@berea.edu", password="secretpass123", full_name="New Student"):
    with patch("app.routers.auth.send_verification_code") as mock_send:
        res = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "full_name": full_name},
        )
    assert res.status_code == 201, res.text
    sent_email, code = mock_send.call_args.args
    assert sent_email == email
    assert CODE_RE.match(code)
    return res.json(), code


def _expire_code(email: str) -> None:
    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == email).one()
        user.verification_code_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
    finally:
        db.close()


def test_register_success(client):
    body, _ = _register_and_capture_code(client)
    assert body["email"] == "new@berea.edu"
    assert body["full_name"] == "New Student"
    assert body["is_active"] is True
    assert body["is_verified"] is False
    assert "hashed_password" not in body


def test_register_rejects_non_berea_email(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "student@gmail.com", "password": "secretpass123", "full_name": "Off Campus"},
    )
    assert res.status_code == 422


def test_register_duplicate_email_conflicts(client, register_user):
    register_user(email="dup@berea.edu")
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "dup@berea.edu", "password": "secretpass123", "full_name": "Other"},
    )
    assert res.status_code == 409


def test_register_rejects_short_password(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "short@berea.edu", "password": "short", "full_name": "Short"},
    )
    assert res.status_code == 422


def test_register_rejects_invalid_email(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "secretpass123", "full_name": "Bad"},
    )
    assert res.status_code == 422


def test_login_blocked_until_verified(client, register_user):
    register_user(email="unverified@berea.edu", password="secretpass123")
    res = client.post(
        "/api/v1/auth/login",
        data={"username": "unverified@berea.edu", "password": "secretpass123"},
    )
    assert res.status_code == 403


def test_login_wrong_password_unauthorized(client, register_user):
    register_user(email="wrongpw@berea.edu", password="secretpass123")
    res = client.post(
        "/api/v1/auth/login",
        data={"username": "wrongpw@berea.edu", "password": "nope"},
    )
    assert res.status_code == 401


def test_login_nonexistent_user_unauthorized(client):
    res = client.post(
        "/api/v1/auth/login",
        data={"username": "ghost@berea.edu", "password": "secretpass123"},
    )
    assert res.status_code == 401


def test_login_succeeds_after_verification(client):
    email = "verifyme@berea.edu"
    _, code = _register_and_capture_code(client, email=email)
    verify_res = client.post("/api/v1/auth/verify-code", json={"email": email, "code": code})
    assert verify_res.status_code == 200
    assert verify_res.json()["access_token"]

    login_res = client.post(
        "/api/v1/auth/login", data={"username": email, "password": "secretpass123"}
    )
    assert login_res.status_code == 200
    assert login_res.json()["token_type"] == "bearer"


def test_me_requires_auth(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_me_returns_current_user(client, auth_headers):
    headers = auth_headers(email="me@berea.edu", full_name="Me Student")
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == "me@berea.edu"
    assert res.json()["full_name"] == "Me Student"


def test_verify_code_wrong_code_rejected(client):
    email = "wrongcode@berea.edu"
    _register_and_capture_code(client, email=email)
    res = client.post("/api/v1/auth/verify-code", json={"email": email, "code": "000000"})
    assert res.status_code == 400


def test_verify_code_unknown_email_rejected(client):
    res = client.post(
        "/api/v1/auth/verify-code", json={"email": "ghost@berea.edu", "code": "123456"}
    )
    assert res.status_code == 400


def test_verify_code_expired_rejected(client):
    email = "expired@berea.edu"
    _, code = _register_and_capture_code(client, email=email)
    _expire_code(email)
    res = client.post("/api/v1/auth/verify-code", json={"email": email, "code": code})
    assert res.status_code == 400


def test_verify_code_already_verified_rejected(client):
    email = "twice@berea.edu"
    _, code = _register_and_capture_code(client, email=email)
    first = client.post("/api/v1/auth/verify-code", json={"email": email, "code": code})
    assert first.status_code == 200

    second = client.post("/api/v1/auth/verify-code", json={"email": email, "code": code})
    assert second.status_code == 400


def test_resend_code_sends_a_new_code(client):
    email = "resend@berea.edu"
    _, first_code = _register_and_capture_code(client, email=email)

    with patch("app.routers.auth.send_verification_code") as mock_send:
        res = client.post("/api/v1/auth/resend-code", json={"email": email})
    assert res.status_code == 200
    sent_email, second_code = mock_send.call_args.args
    assert sent_email == email
    assert second_code != first_code

    verify_res = client.post(
        "/api/v1/auth/verify-code", json={"email": email, "code": second_code}
    )
    assert verify_res.status_code == 200


def test_resend_code_unknown_email_generic_response(client):
    with patch("app.routers.auth.send_verification_code") as mock_send:
        res = client.post("/api/v1/auth/resend-code", json={"email": "ghost@berea.edu"})
    assert res.status_code == 200
    mock_send.assert_not_called()


def test_resend_code_already_verified_does_not_send(client):
    email = "alreadyverified@berea.edu"
    _, code = _register_and_capture_code(client, email=email)
    client.post("/api/v1/auth/verify-code", json={"email": email, "code": code})

    with patch("app.routers.auth.send_verification_code") as mock_send:
        res = client.post("/api/v1/auth/resend-code", json={"email": email})
    assert res.status_code == 200
    mock_send.assert_not_called()
