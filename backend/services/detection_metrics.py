from database.db import SessionLocal
from database.models import Detection


def get_detection_metrics():

    db = SessionLocal()
    try:
        detections = db.query(
            Detection
        ).all()

        total = len(detections)

        successful = len(
            [
                d
                for d in detections
                if d.detected
            ]
        )

        failed = total - successful

        return {
            "total_detections": total,
            "successful": successful,
            "failed": failed
        }
    finally:
        db.close()