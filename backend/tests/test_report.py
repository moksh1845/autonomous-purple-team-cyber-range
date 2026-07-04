"""
Tests for GET /report in main.py.

Covers: RBAC, response shape, and that the math is internally consistent
(detected + missed == total) rather than the dead, broken
services/report_generator.py path (which referenced response keys that
calculate_detection_gaps() never returns).
"""

from tests.conftest import auth_header
from database.models import Technique, Attack, Detection


def test_report_requires_authentication(client):
    response = client.get("/report")
    assert response.status_code == 401


def test_report_returns_consistent_summary(client, admin_token, db_session):
    db_session.add(Technique(technique_id="T1046", technique_name="Network Scan", tactic="Discovery"))
    db_session.commit()

    attack = Attack(technique_id="T1046", attack_name="x", target_machine="m", status="Executed")
    db_session.add(attack)
    db_session.commit()
    db_session.refresh(attack)

    db_session.add(Detection(attack_id=attack.id, source="Wazuh", rule_id="100001", detected=True))
    db_session.commit()

    response = client.get("/report", headers=auth_header(admin_token))
    assert response.status_code == 200

    body = response.json()
    summary = body["summary"]

    assert summary["total_attacks"] == 1
    assert summary["detected_attacks"] == 1
    assert summary["missed_attacks"] == 0
    assert summary["detected_attacks"] + summary["missed_attacks"] == summary["total_attacks"]
    assert 0 <= summary["coverage_percentage"] <= 100
    assert 0 <= summary["purple_team_score"] <= 100


def test_report_with_no_data_does_not_error(client, admin_token):
    """Division-by-zero guard: report must not 500 on an empty database."""
    response = client.get("/report", headers=auth_header(admin_token))
    assert response.status_code == 200
    summary = response.json()["summary"]
    assert summary["total_attacks"] == 0
    assert summary["detection_rate"] == 0
    assert summary["coverage_percentage"] == 0
