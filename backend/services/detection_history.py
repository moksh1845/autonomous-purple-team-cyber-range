from database.db import SessionLocal
from database.models import Detection, Attack


def get_detection_history():

    db = SessionLocal()
    try:
        detections = db.query(
            Detection,
            Attack
        ).join(
            Attack,
            Detection.attack_id == Attack.id
        ).all()

        result = []

        for detection, attack in detections:

            result.append(
                {
                    "attack_id": attack.id,
                    "technique_id": attack.technique_id,
                    "detected": detection.detected,
                    "rule_id": detection.rule_id,
                    "latency": detection.latency_seconds
                }
            )

        return result
    finally:
        db.close()