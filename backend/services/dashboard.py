from database.db import SessionLocal
from database.models import Attack, Detection


def get_dashboard():

    db = SessionLocal()
    try:
        total_attacks = db.query(
            Attack
        ).count()

        total_detections = db.query(
            Detection
        ).filter(
            Detection.detected == True
        ).count()

        rate = 0

        if total_attacks > 0:

            rate = round(
                (
                    total_detections /
                    total_attacks
                ) * 100,
                2
            )

        result = {
            "total_attacks": total_attacks,
            "total_detections": total_detections,
            "detection_rate": rate
        }

        return result
    finally:
        db.close()