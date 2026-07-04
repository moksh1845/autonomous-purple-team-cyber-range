from fastapi import APIRouter
from database.db import SessionLocal
from services.scorecard import get_scorecard_data

router = APIRouter()


@router.get("/purple-score")
def purple_score():
    db = SessionLocal()
    try:
        data = get_scorecard_data(db)
        return {
            "purple_score": data["purple_team_score"],
            "detection_rate": data["detection_rate"],
            "total_attacks": data["total_attacks"],
            "detected_attacks": data["detected_attacks"],
            "missed_attacks": data["missed_attacks"]
        }
    finally:
        db.close()