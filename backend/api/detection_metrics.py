from fastapi import APIRouter
from database.db import SessionLocal
from database.models import Detection

router = APIRouter()


@router.get("/metrics")
def get_metrics():

    db = SessionLocal()

    total_attacks = db.query(Detection).count()

    detected_attacks = db.query(Detection).filter(
        Detection.detected == True
    ).count()

    detection_rate = 0

    if total_attacks > 0:
        detection_rate = round(
            (detected_attacks / total_attacks) * 100,
            2
        )

    db.close()

    return {
        "total_attacks": total_attacks,
        "detected_attacks": detected_attacks,
        "detection_rate": detection_rate
    }