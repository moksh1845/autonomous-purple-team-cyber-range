"""
Single shared entry point for running a technique, used by both
POST /execute/{technique_id} and POST /simulate -- previously these
duplicated near-identical attack-creation + detection-validation logic
independently (main.py's execute_attack_and_detect vs
routes/simulations.py's simulate_attack), which is exactly the kind of
drift that let the earlier SIM-001 hardcoded-detection bug exist in only
ONE of the two paths without anyone noticing the other had diverged.
"""

from datetime import datetime, timezone

from database.db import SessionLocal
from database.models import Attack, Detection, AtomicExecution, Simulation
from detectors.detection_manager import validate_detection
from orchestrator.attack_manager import execute_attack as run_atomic


def execute_technique(technique_id: str, executed_by: str, record_simulation: bool = False) -> dict:
    """
    record_simulation=True also writes a Simulation row (used by the
    /simulate endpoint, which historically tracked a "recent simulations"
    list separately from raw Attack/Detection rows).
    """
    db = SessionLocal()
    try:
        atomic_result = run_atomic(technique_id)

        attack = Attack(
            technique_id=technique_id,
            attack_name=f"Atomic Red Team — {technique_id}",
            target_machine="LocalHost",
            status="Executed" if atomic_result["status"] == "success" else "Failed",
        )
        db.add(attack)
        db.commit()
        db.refresh(attack)

        if atomic_result["status"] == "success":
            for step in atomic_result.get("steps", []):
                db.add(
                    AtomicExecution(
                        attack_id=attack.id,
                        atomic_test_number=step.get("TestNumber"),
                        atomic_test_name=step.get("TestName"),
                        command_executed=step.get("Command"),
                        exit_code=step.get("ExitCode"),
                        raw_output=step.get("Output"),
                    )
                )
            db.commit()

        if atomic_result["status"] != "success":
            if record_simulation:
                db.add(
                    Simulation(
                        technique_id=technique_id,
                        technique_name=technique_id,
                        tactic=None,
                        status="failed",
                        confidence=0,
                        detected=False,
                        execution_log=atomic_result.get("message"),
                        completed_at=datetime.now(timezone.utc),
                    )
                )
                db.commit()
            return {
                "success": False,
                "attack_id": attack.id,
                "technique_id": technique_id,
                "message": atomic_result.get("message"),
            }

        detection_result = validate_detection(technique_id)

        if not detection_result.get("persisted"):
            db.add(
                Detection(
                    attack_id=attack.id,
                    source=detection_result["source"],
                    rule_id=detection_result["rule_id"],
                    detected=detection_result["detected"],
                    latency_seconds=detection_result["latency_seconds"],
                )
            )
            db.commit()

        if record_simulation:
            if detection_result["detected"]:
                sim_status = "success"
            elif detection_result["mode"] == "live":
                sim_status = "gap"
            else:
                sim_status = "simulated"

            db.add(
                Simulation(
                    technique_id=technique_id,
                    technique_name=technique_id,
                    tactic=None,
                    status=sim_status,
                    confidence=95 if detection_result["detected"] else 0,
                    detected=detection_result["detected"],
                    execution_log=atomic_result.get("output"),
                    completed_at=datetime.now(timezone.utc),
                )
            )
            db.commit()

        return {
            "success": True,
            "attack_id": attack.id,
            "technique_id": technique_id,
            "atomic_output": atomic_result.get("output"),
            "detection": {
                "mode": detection_result["mode"],
                "detected": detection_result["detected"],
                "source": detection_result["source"],
                "rule_id": detection_result["rule_id"],
                "latency_seconds": detection_result["latency_seconds"],
                "reason": detection_result.get("reason"),
            },
        }
    finally:
        db.close()
