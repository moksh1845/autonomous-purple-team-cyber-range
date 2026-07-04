from database.db import SessionLocal
from database.models import Attack


def create_attack(
    technique_id,
    attack_name,
    target_machine,
    status="executed"
):

    db = SessionLocal()
    try:
        attack = Attack(
            technique_id=technique_id,
            attack_name=attack_name,
            target_machine=target_machine,
            status=status
        )

        db.add(attack)
        db.commit()
        db.refresh(attack)

        return attack.id
    finally:
        db.close()