def test_register_success(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "new@berea.edu", "password": "secretpass123", "full_name": "New Student"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["email"] == "new@berea.edu"
    assert body["full_name"] == "New Student"
    assert body["is_active"] is True
    assert "hashed_password" not in body


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


def test_login_success(client, register_user):
    register_user(email="login@berea.edu", password="secretpass123")
    res = client.post(
        "/api/v1/auth/login",
        data={"username": "login@berea.edu", "password": "secretpass123"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


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


def test_me_requires_auth(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_me_returns_current_user(client, auth_headers):
    headers = auth_headers(email="me@berea.edu", full_name="Me Student")
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == "me@berea.edu"
    assert res.json()["full_name"] == "Me Student"
