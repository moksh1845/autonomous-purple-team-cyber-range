from database.db import SessionLocal
from database.models import Attack


def get_coverage():

    db = SessionLocal()
    try:
        attacks = db.query(
            Attack
        ).all()

        techniques = list(
            set(
                [
                    attack.technique_id
                    for attack in attacks
                ]
            )
        )

        return {
            "covered": len(techniques),
            "techniques": techniques
        }
    finally:
        db.close()