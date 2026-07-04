from database.db import SessionLocal
from database.models import (
    Attack,
    Detection
)

from services.detection_gap import (
    calculate_detection_gaps
)

from services.risk_score import (
    get_risk_score
)


def generate_report():

    db = SessionLocal()

    try:

        total_attacks = db.query(
            Attack
        ).count()

        detected_attacks = db.query(
            Detection
        ).filter(
            Detection.detected == True
        ).count()

        gaps = calculate_detection_gaps()

        risk = get_risk_score()

        report = {

            "executive_summary": {

                "total_attacks":
                total_attacks,

                "detected_attacks":
                detected_attacks,

                "coverage":
                gaps["coverage"],

                "risk_level":
                risk["risk_level"]
            },

            "detection_gaps":
            gaps["gaps"],

            "risk":
            risk
        }

        return report

    finally:

        db.close()