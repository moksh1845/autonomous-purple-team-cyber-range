from fastapi import APIRouter, Depends

from services.audit import log_action
from security.rbac import require_role
from security.auth import get_current_user

from database.db import SessionLocal
from database.models import Technique, Simulation

router = APIRouter()


# NOTE: GET /techniques used to be defined here AND in main.py. Because this
# router is included before main.py's own @app.get("/techniques") line runs,
# FastAPI was matching THIS (unauthenticated) version first -- so /techniques
# was silently unauthenticated despite main.py appearing to protect it. The
# duplicate definition is removed; main.py's authenticated version is now the
# only one, and is the one that actually gets matched.


@router.get("/simulations")
def get_simulations(current_user=Depends(get_current_user)):
    db = SessionLocal()
    try:
        simulations = (
            db.query(Simulation)
            .order_by(Simulation.started_at.desc())
            .limit(20)
            .all()
        )

        return [
            {
                "id": s.id,
                "technique_id": s.technique_id,
                "technique_name": s.technique_name,
                "tactic": s.tactic,
                "status": s.status,
                "confidence": s.confidence,
                "detected": s.detected,
                "started_at": s.started_at,
                "completed_at": s.completed_at,
            }
            for s in simulations
        ]
    finally:
        db.close()


@router.post("/simulate")
def simulate_attack(
    payload: dict,
    current_user=Depends(require_role(["Admin", "Purple Team Lead"])),
):
    """
    Runs the same real Atomic Red Team execution + detection validation as
    POST /execute/{technique_id}, via the shared services.execution_service
    -- previously this endpoint had its own separate copy of attack-creation
    and detection-validation logic (and its own hardcoded fake detection,
    rule_id="SIM-001", before that bug was fixed). Two independent copies of
    this logic is exactly what let them drift apart originally; there is now
    exactly one implementation, used by both routes.
    """
    from services.execution_service import execute_technique

    technique_id = payload.get("technique_id")

    db = SessionLocal()
    try:
        technique = (
            db.query(Technique).filter(Technique.technique_id == technique_id).first()
        )
    finally:
        db.close()

    if not technique:
        return {"success": False, "message": "Technique not found"}

    result = execute_technique(
        technique_id, executed_by=current_user["sub"], record_simulation=True
    )

    log_action(current_user["sub"], f"Executed {technique_id}")

    if result.get("success") and "technique_name" not in result:
        result["technique_name"] = technique.technique_name

    return result
