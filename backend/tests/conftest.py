import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.core.database import Base, get_db
from app.main import app
from app.models.user import User

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _clean_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def register_user(client):
    def _register(email="alice@berea.edu", password="secretpass123", full_name="Alice"):
        res = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "full_name": full_name},
        )
        assert res.status_code == 201, res.text
        return res.json()

    return _register


def _verify_user_directly(email: str) -> None:
    """Bypass the email code flow for tests that just need a logged-in user.

    The actual verify-code/resend-code flow has its own dedicated tests in
    test_auth.py.
    """
    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == email).one()
        user.is_verified = True
        db.commit()
    finally:
        db.close()


@pytest.fixture
def auth_headers(client, register_user):
    def _login(email="alice@berea.edu", password="secretpass123", full_name="Alice"):
        register_user(email=email, password=password, full_name=full_name)
        _verify_user_directly(email)
        res = client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": password},
        )
        assert res.status_code == 200, res.text
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _login
