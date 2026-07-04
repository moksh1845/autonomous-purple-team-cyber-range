from database.db import SessionLocal
from database.models import Attack


def get_attack_history():

    db = SessionLocal()
    try:
        attacks = db.query(
            Attack
        ).order_by(
            Attack.execution_time.desc()
        ).all()

        result = []

        for attack in attacks:

            result.append(
                {
                    "id": attack.id,
                    "technique_id": attack.technique_id,
                    "target": attack.target_machine,
                    "status": attack.status,
                    "time": attack.execution_time
                }
            )

        return result
    finally:
        db.close()