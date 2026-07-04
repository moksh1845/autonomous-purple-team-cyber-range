from sqlalchemy import distinct

from database.db import SessionLocal

from database.models import (
    Attack,
    Detection
)


def get_risk_score():

    db = SessionLocal()

    try:

        total_attacks = db.query(
            Attack
        ).count()

        detected_attacks = db.query(
            distinct(
                Detection.attack_id
            )
        ).filter(
            Detection.detected == True
        ).count()

        missed_attacks = max(
            0,
            total_attacks - detected_attacks
        )

        if total_attacks == 0:

            return {
                "risk_score": 0,
                "risk_level": "Unknown",
                "coverage": 0,
                "total_attacks": 0,
                "detected_attacks": 0,
                "missed_attacks": 0
            }

        coverage = round(
            (detected_attacks / total_attacks) * 100,
            2
        )

        risk_score = round(
            100 - coverage,
            2
        )

        if risk_score <= 20:
            risk_level = "Low"

        elif risk_score <= 50:
            risk_level = "Medium"

        else:
            risk_level = "High"

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "coverage": coverage,
            "total_attacks": total_attacks,
            "detected_attacks": detected_attacks,
            "missed_attacks": missed_attacks
        }

    finally:
        db.close()