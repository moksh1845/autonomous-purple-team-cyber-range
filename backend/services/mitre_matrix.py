from database.db import SessionLocal
from database.models import Attack


TACTICS = {
    "T1046": "Discovery",
    "T1003": "Credential Access",
    "T1547": "Persistence",
    "T1110": "Credential Access",
    "T1059": "Execution"
}


def get_mitre_matrix():

    db = SessionLocal()
    try:
        attacks = db.query(
            Attack
        ).all()

        matrix = {}

        for attack in attacks:

            tactic = TACTICS.get(
                attack.technique_id,
                "Other"
            )

            if tactic not in matrix:
                matrix[tactic] = []

            if attack.technique_id not in matrix[tactic]:
                matrix[tactic].append(
                    attack.technique_id
                )

        return matrix
    finally:
        db.close()