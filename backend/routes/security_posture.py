from fastapi import APIRouter
from database.db import SessionLocal
from services.risk_score import get_risk_score
from services.scorecard import get_scorecard_data

router = APIRouter()


@router.get("/security-posture")
def security_posture():
    risk = get_risk_score()
    db = SessionLocal()
    try:
        data = get_scorecard_data(db)
        coverage = data["coverage_percentage"]
        missed = data["missed_attacks"]
    finally:
        db.close()

    if coverage >= 90:
        posture = "Excellent"
    elif coverage >= 75:
        posture = "Good"
    elif coverage >= 50:
        posture = "Fair"
    else:
        posture = "Poor"

    return {
        "security_posture": posture,
        "coverage": coverage,
        "risk_level": risk["risk_level"],
        "risk_score": risk["risk_score"],
        "detection_gaps": missed
    }