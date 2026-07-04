from fastapi import APIRouter
from sqlalchemy import func

from database.db import SessionLocal
from database.models import Detection

router = APIRouter()

@router.get("/detection-trends")
def detection_trends():

    db = SessionLocal()
    try:
        data = (
            db.query(
                func.date(
                    Detection.detection_time
                ),
                func.count(
                    Detection.id
                )
            )
            .filter(
                Detection.detected == True
            )
            .group_by(
                func.date(
                    Detection.detection_time
                )
            )
            .all()
        )

        return [
            {
                "date":
                str(row[0]),

                "detections":
                row[1]
            }
            for row in data
        ]
    finally:
        db.close()