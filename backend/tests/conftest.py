"""
Pytest fixtures shared by every test module.

Tests never touch the real Postgres/Wazuh instances — every required
setting is overridden to a throwaway in-memory SQLite database and dummy
values BEFORE any backend module is imported, so config.settings.settings
never tries to read a real .env or fail on missing required fields.
"""

import os

# Required Settings fields must exist before `from config.settings import
# settings` runs anywhere in the import graph (main.py, database.db, etc).
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("WAZUH_HOST", "https://wazuh.test:55000")
os.environ.setdefault("WAZUH_USER", "test")
os.environ.setdefault("WAZUH_PASSWORD", "test")
os.environ.setdefault("INDEXER_HOST", "https://wazuh.test:9200")
os.environ.setdefault("INDEXER_USER", "test")
os.environ.setdefault("INDEXER_PASSWORD", "test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import database.db as db_module


@pytest.fixture(scope="function")
def test_engine():
    """A fresh in-memory SQLite database per test function."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def app(test_engine, monkeypatch):
    """
    Build the FastAPI app against the throwaway test database.

    Patches database.db.engine/SessionLocal BEFORE importing main, so every
    module that does `from database.db import SessionLocal` at import time
    picks up the test database instead of the real one.
    """
    TestSessionLocal = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)

    monkeypatch.setattr(db_module, "engine", test_engine)
    monkeypatch.setattr(db_module, "SessionLocal", TestSessionLocal)

    import database.models as models

    models.Base.metadata.create_all(bind=test_engine)

    import importlib
    import main as main_module

    importlib.reload(main_module)

    # main.py imports SessionLocal at module scope in a few services
    # (services/correlate_attack.py, services/detection_gap.py, etc) -
    # patch those too, since monkeypatch only covers database.db itself.
    import services.audit as audit_module
    import services.correlate_attack as correlate_module
    import services.detection_gap as gap_module
    import detectors.detection_manager as detection_manager_module

    monkeypatch.setattr(audit_module, "SessionLocal", TestSessionLocal)
    monkeypatch.setattr(correlate_module, "SessionLocal", TestSessionLocal)
    monkeypatch.setattr(gap_module, "SessionLocal", TestSessionLocal)
    monkeypatch.setattr(detection_manager_module, "SessionLocal", TestSessionLocal)

    return main_module.app


@pytest.fixture(scope="function")
def client(app):
    return TestClient(app)


@pytest.fixture(scope="function")
def db_session(test_engine):
    TestSessionLocal = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)
    session = TestSessionLocal()
    yield session
    session.close()


def _register_and_set_role(client, db_session, username, email, password, role):
    from database.models import User

    client.post(
        "/auth/register",
        json={"username": username, "email": email, "password": password},
    )

    user = db_session.query(User).filter(User.username == username).first()
    user.role = role
    db_session.commit()


@pytest.fixture(scope="function")
def admin_token(client, db_session):
    _register_and_set_role(
        client, db_session, "admin_user", "admin@test.com", "AdminPass123!", "Admin"
    )
    response = client.post(
        "/auth/login", json={"username": "admin_user", "password": "AdminPass123!"}
    )
    return response.json()["access_token"]


@pytest.fixture(scope="function")
def lead_token(client, db_session):
    _register_and_set_role(
        client, db_session, "lead_user", "lead@test.com", "LeadPass123!", "Purple Team Lead"
    )
    response = client.post(
        "/auth/login", json={"username": "lead_user", "password": "LeadPass123!"}
    )
    return response.json()["access_token"]


@pytest.fixture(scope="function")
def viewer_token(client, db_session):
    _register_and_set_role(
        client, db_session, "viewer_user", "viewer@test.com", "ViewerPass123!", "Viewer"
    )
    response = client.post(
        "/auth/login", json={"username": "viewer_user", "password": "ViewerPass123!"}
    )
    return response.json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}
