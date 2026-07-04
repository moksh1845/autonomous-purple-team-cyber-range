"""
Tests for backend/main.py register_user / login_user.

Covers the two bugs that were fixed:
  - missing HTTPException import (previously caused a 500 on bad input)
  - login audit logging (previously dead code on the failure branch)
"""

from tests.conftest import auth_header


def test_register_creates_viewer_by_default(client, db_session):
    response = client.post(
        "/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "Sup3rSecret!"},
    )
    assert response.status_code == 200

    from database.models import User

    user = db_session.query(User).filter(User.username == "alice").first()
    assert user is not None
    assert user.role == "Viewer"
    # Password must never be stored in plaintext.
    assert user.password_hash != "Sup3rSecret!"


def test_register_duplicate_username_returns_400_not_500(client):
    """
    Regression test for the missing `HTTPException` import in main.py,
    which previously turned this into an unhandled 500 NameError.
    """
    payload = {"username": "bob", "email": "bob@example.com", "password": "Sup3rSecret!"}
    first = client.post("/auth/register", json=payload)
    assert first.status_code == 200

    second = client.post("/auth/register", json=payload)
    assert second.status_code == 400
    assert "already exists" in second.json()["detail"].lower()


def test_register_rejects_short_password(client):
    response = client.post(
        "/auth/register",
        json={"username": "shortpw", "email": "shortpw@example.com", "password": "abc"},
    )
    assert response.status_code == 422


def test_register_rejects_invalid_email(client):
    response = client.post(
        "/auth/register",
        json={"username": "bademail", "email": "not-an-email", "password": "Sup3rSecret!"},
    )
    assert response.status_code == 422


def test_login_with_wrong_password_returns_401_not_500(client):
    """
    Regression test: previously the failure branch raised HTTPException
    without it being imported (NameError -> 500), and the only log_action
    call lived unreachable inside that same branch.
    """
    client.post(
        "/auth/register",
        json={"username": "carol", "email": "carol@example.com", "password": "Sup3rSecret!"},
    )

    response = client.post(
        "/auth/login", json={"username": "carol", "password": "WrongPassword!"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_with_unknown_username_returns_401(client):
    response = client.post(
        "/auth/login", json={"username": "nobody", "password": "whatever"}
    )
    assert response.status_code == 401


def test_successful_login_returns_jwt(client):
    client.post(
        "/auth/register",
        json={"username": "dave", "email": "dave@example.com", "password": "Sup3rSecret!"},
    )
    response = client.post(
        "/auth/login", json={"username": "dave", "password": "Sup3rSecret!"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert len(body["access_token"].split(".")) == 3  # header.payload.signature


def test_failed_and_successful_login_are_both_audit_logged(client, db_session):
    """
    Regression test for the login-audit-logging bug: previously a failed
    login was never logged, and a successful login's only log_action call
    was unreachable dead code inside the failure branch.
    """
    client.post(
        "/auth/register",
        json={"username": "erin", "email": "erin@example.com", "password": "Sup3rSecret!"},
    )
    client.post("/auth/login", json={"username": "erin", "password": "WrongPassword!"})
    client.post("/auth/login", json={"username": "erin", "password": "Sup3rSecret!"})

    from sqlalchemy import text

    rows = db_session.execute(
        text("SELECT username, action FROM audit_logs WHERE username = 'erin' ORDER BY id")
    ).fetchall()

    actions = [row[1] for row in rows]
    assert "User Registration" in actions
    assert "Failed Login" in actions
    assert "User Login" in actions


def test_protected_route_without_token_is_rejected(client):
    response = client.get("/attacks")
    assert response.status_code == 401


def test_protected_route_with_token_succeeds(client, viewer_token):
    response = client.get("/attacks", headers=auth_header(viewer_token))
    assert response.status_code == 200
