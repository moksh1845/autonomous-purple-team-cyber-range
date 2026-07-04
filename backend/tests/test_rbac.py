"""
RBAC tests — verify Viewer/Purple Team Lead/Admin boundaries that were
previously missing from almost every route in main.py.
"""

from tests.conftest import auth_header


def test_viewer_cannot_create_attack(client, viewer_token):
    response = client.post(
        "/attacks",
        json={
            "technique_id": "T1046",
            "attack_name": "x",
            "target_machine": "m",
            "status": "completed",
        },
        headers=auth_header(viewer_token),
    )
    assert response.status_code == 403


def test_admin_can_create_attack(client, admin_token):
    response = client.post(
        "/attacks",
        json={
            "technique_id": "T1046",
            "attack_name": "x",
            "target_machine": "m",
            "status": "completed",
        },
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200


def test_purple_team_lead_can_create_attack(client, lead_token):
    response = client.post(
        "/attacks",
        json={
            "technique_id": "T1046",
            "attack_name": "x",
            "target_machine": "m",
            "status": "completed",
        },
        headers=auth_header(lead_token),
    )
    assert response.status_code == 200


def test_viewer_cannot_create_technique_admin_only(client, viewer_token, lead_token):
    """/techniques creation is Admin-only, stricter than Purple Team Lead."""
    payload = {"technique_id": "T1110", "technique_name": "Brute Force", "tactic": "Credential Access"}

    viewer_response = client.post("/techniques", json=payload, headers=auth_header(viewer_token))
    assert viewer_response.status_code == 403

    lead_response = client.post("/techniques", json=payload, headers=auth_header(lead_token))
    assert lead_response.status_code == 403


def test_admin_can_create_technique(client, admin_token):
    response = client.post(
        "/techniques",
        json={"technique_id": "T1110", "technique_name": "Brute Force", "tactic": "Credential Access"},
        headers=auth_header(admin_token),
    )
    assert response.status_code == 200


def test_audit_logs_requires_admin(client, viewer_token, lead_token, admin_token):
    """
    Regression test: GET /audit-logs previously had NO auth dependency at
    all, meaning anyone could read the full audit trail unauthenticated.
    """
    no_auth = client.get("/audit-logs")
    assert no_auth.status_code == 401

    viewer_response = client.get("/audit-logs", headers=auth_header(viewer_token))
    assert viewer_response.status_code == 403

    lead_response = client.get("/audit-logs", headers=auth_header(lead_token))
    assert lead_response.status_code == 403

    admin_response = client.get("/audit-logs", headers=auth_header(admin_token))
    assert admin_response.status_code == 200


def test_report_requires_admin_or_lead(client, viewer_token, admin_token):
    viewer_response = client.get("/report", headers=auth_header(viewer_token))
    assert viewer_response.status_code == 403

    admin_response = client.get("/report", headers=auth_header(admin_token))
    assert admin_response.status_code == 200


def test_invalid_token_is_rejected(client):
    response = client.get("/attacks", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401
