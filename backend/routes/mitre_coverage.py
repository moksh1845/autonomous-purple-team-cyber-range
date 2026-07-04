from fastapi import APIRouter, Depends
from sqlalchemy import distinct
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import Attack, Technique
from security.auth import get_current_user

router = APIRouter()


@router.get("/mitre-coverage")
def mitre_coverage(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Previously hardcoded to 5 — now reflects however many techniques are
    # actually seeded (e.g. 222 real MITRE techniques via
    # services/mitre_loader.py, not a hand-typed handful).
    total_known_techniques = db.query(Technique).count()

    executed_techniques = db.query(distinct(Attack.technique_id)).count()

    coverage = (
        round((executed_techniques / total_known_techniques) * 100, 2)
        if total_known_techniques > 0
        else 0
    )

    return {
        "total_techniques": total_known_techniques,
        "executed_techniques": executed_techniques,
        "coverage": coverage,
    }
