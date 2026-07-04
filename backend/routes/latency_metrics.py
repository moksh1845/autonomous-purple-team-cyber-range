from fastapi import APIRouter
from sqlalchemy import func

from database.db import SessionLocal
from database.models import Detection

router = APIRouter()


@router.get("/latency-metrics")
def latency_metrics():

    db = SessionLocal()

    try:

        avg_latency = db.query(
            func.avg(
                Detection.latency_seconds
            )
        ).scalar()

        min_latency = db.query(
            func.min(
                Detection.latency_seconds
            )
        ).scalar()

        max_latency = db.query(
            func.max(
                Detection.latency_seconds
            )
        ).scalar()

        total_detections = db.query(
            Detection
        ).filter(
            Detection.detected == True
        ).count()

        return {

            "average_latency":
            round(
                avg_latency,
                2
            ) if avg_latency else 0,

            "minimum_latency":
            min_latency or 0,

            "maximum_latency":
            max_latency or 0,

            "total_detections":
            total_detections
        }

    finally:

        db.close()