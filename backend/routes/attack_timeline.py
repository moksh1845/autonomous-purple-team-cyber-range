from fastapi import APIRouter

from database.db import SessionLocal
from database.models import (
    Attack,
    Detection
)

router = APIRouter()

@router.get("/attack-timeline")
def attack_timeline():

    db = SessionLocal()
    try:
        attacks = db.query(
            Attack
        ).all()

        timeline = []

        for attack in attacks:

            detection = (
                db.query(
                    Detection
                )
                .filter(
                    Detection.attack_id ==
                    attack.id
                )
                .first()
            )

            timeline.append({

                "attack_id":
                attack.id,

                "technique_id":
                attack.technique_id,

                "attack_name":
                attack.attack_name,

                "executed_at":
                attack.execution_time,

                "detected":
                detection.detected
                if detection
                else False,

                "latency":
                detection.latency_seconds
                if detection
                else None
            })

        return timeline
    finally:
        db.close()