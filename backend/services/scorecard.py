from database.db import SessionLocal
from database.models import Attack, Detection, Technique
from sqlalchemy import distinct, func


def get_scorecard_data(db):
    total_attacks = db.query(Attack).count()
    detected_attacks = db.query(distinct(Detection.attack_id)).filter(Detection.detected == True).count()
    missed_attacks = max(0, total_attacks - detected_attacks)
    detection_rate = round((detected_attacks / total_attacks) * 100, 2) if total_attacks > 0 else 0.0

    total_techniques = db.query(Technique).count()
    executed_techniques = db.query(distinct(Attack.technique_id)).count()
    coverage_percentage = min(round((executed_techniques / total_techniques) * 100, 2) if total_techniques > 0 else 0.0, 100.0)

    avg_latency = db.query(func.avg(Detection.latency_seconds)).scalar() or 0.0
    avg_latency = round(avg_latency, 2)

    if avg_latency <= 2:
        latency_score = 100
    elif avg_latency <= 5:
        latency_score = 80
    elif avg_latency <= 10:
        latency_score = 60
    else:
        latency_score = 40

    purple_team_score = round(
        (coverage_percentage * 0.5 + detection_rate * 0.4 + latency_score * 0.1), 2
    )

    return {
        "total_attacks": total_attacks,
        "detected_attacks": detected_attacks,
        "missed_attacks": missed_attacks,
        "detection_rate": detection_rate,
        "total_techniques": total_techniques,
        "executed_techniques": executed_techniques,
        "coverage_percentage": coverage_percentage,
        "average_latency": avg_latency,
        "purple_team_score": purple_team_score,
    }


def get_scorecard():
    db = SessionLocal()
    try:
        data = get_scorecard_data(db)
        return {
            "coverage_percentage": data["coverage_percentage"],
            "detection_rate": data["detection_rate"],
            "average_latency": data["average_latency"],
            "purple_team_score": data["purple_team_score"],
        }
    finally:
        db.close()