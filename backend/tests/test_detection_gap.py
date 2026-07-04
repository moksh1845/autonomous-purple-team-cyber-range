"""
Tests for services/detection_gap.py — the rewritten per-technique gap
analysis (Phase B item 4). Verifies the response shape matches what the
frontend (DetectionGaps.jsx) actually expects, and that the per-technique
Covered / Gap / Not Tested logic is correct — not just a numeric ratio
trick like the previous implementation.
"""

from database.models import Technique, Attack, Detection
from services.detection_gap import calculate_detection_gaps


def test_no_data_returns_zeroed_summary(app, db_session):
    import services.detection_gap as gap_module

    result = gap_module.calculate_detection_gaps()

    assert result["executed_attacks"] == 0
    assert result["detected_attacks"] == 0
    assert result["missed_attacks"] == 0
    assert result["coverage"] == 0
    assert result["gaps"] == []


def test_response_shape_matches_frontend_contract(app, db_session):
    """
    Regression test for the contract break: the frontend expects
    coverage / executed_attacks / detected_attacks / missed_attacks / gaps,
    not the old total_techniques / total_attacks / total_detections /
    coverage_percent shape.
    """
    import services.detection_gap as gap_module

    db_session.add(Technique(technique_id="T1046", technique_name="Network Scan", tactic="Discovery"))
    db_session.commit()

    result = gap_module.calculate_detection_gaps()

    for key in ("coverage", "executed_attacks", "detected_attacks", "missed_attacks", "gaps"):
        assert key in result, f"Missing expected key: {key}"

    assert isinstance(result["gaps"], list)
    if result["gaps"]:
        gap_row = result["gaps"][0]
        for key in ("technique_id", "technique_name", "tested", "detected", "status"):
            assert key in gap_row


def test_technique_never_attacked_is_not_tested(app, db_session):
    import services.detection_gap as gap_module

    db_session.add(Technique(technique_id="T1059", technique_name="Command Interpreter", tactic="Execution"))
    db_session.commit()

    result = gap_module.calculate_detection_gaps()
    row = next(g for g in result["gaps"] if g["technique_id"] == "T1059")

    assert row["tested"] is False
    assert row["detected"] is False
    assert row["status"] == "Not Tested"


def test_technique_attacked_but_not_detected_is_a_gap(app, db_session):
    import services.detection_gap as gap_module

    db_session.add(Technique(technique_id="T1110", technique_name="Brute Force", tactic="Credential Access"))
    db_session.commit()

    attack = Attack(technique_id="T1110", attack_name="x", target_machine="m", status="Executed")
    db_session.add(attack)
    db_session.commit()
    db_session.refresh(attack)

    db_session.add(Detection(attack_id=attack.id, source="Wazuh", detected=False))
    db_session.commit()

    result = gap_module.calculate_detection_gaps()
    row = next(g for g in result["gaps"] if g["technique_id"] == "T1110")

    assert row["tested"] is True
    assert row["detected"] is False
    assert row["status"] == "Gap"
    assert result["missed_attacks"] == 1
    assert result["detected_attacks"] == 0


def test_technique_attacked_and_detected_is_covered(app, db_session):
    import services.detection_gap as gap_module

    db_session.add(Technique(technique_id="T1003", technique_name="Credential Dumping", tactic="Credential Access"))
    db_session.commit()

    attack = Attack(technique_id="T1003", attack_name="x", target_machine="m", status="Executed")
    db_session.add(attack)
    db_session.commit()
    db_session.refresh(attack)

    db_session.add(Detection(attack_id=attack.id, source="Wazuh", rule_id="100001", detected=True))
    db_session.commit()

    result = gap_module.calculate_detection_gaps()
    row = next(g for g in result["gaps"] if g["technique_id"] == "T1003")

    assert row["tested"] is True
    assert row["detected"] is True
    assert row["status"] == "Covered"
    assert result["detected_attacks"] == 1
    assert result["coverage"] == 100.0


def test_detection_gaps_endpoint_requires_auth(client):
    response = client.get("/detection-gaps")
    assert response.status_code == 401


def test_detection_gaps_endpoint_works_when_authenticated(client, viewer_token):
    from tests.conftest import auth_header

    response = client.get("/detection-gaps", headers=auth_header(viewer_token))
    assert response.status_code == 200
    body = response.json()
    assert "gaps" in body
    assert "coverage" in body
