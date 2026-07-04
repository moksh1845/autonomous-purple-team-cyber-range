from database.db import SessionLocal
from services.risk_score import get_risk_score
from services.scorecard import get_scorecard_data


def get_executive_dashboard():
    db = SessionLocal()
    try:
        data = get_scorecard_data(db)
        return {
            "purple_score": data["purple_team_score"],
            "coverage": data["coverage_percentage"],
            "total_attacks": data["total_attacks"],
            "detected_attacks": data["detected_attacks"],
            "missed_attacks": data["missed_attacks"],
            "risk": get_risk_score()
        }
    finally:
        db.close()