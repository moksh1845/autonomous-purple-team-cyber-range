from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import Attack
from security.auth import get_current_user

router = APIRouter()


@router.get("/mitre-heatmap")
def mitre_heatmap(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    data = (
        db.query(Attack.technique_id, func.count(Attack.id))
        .group_by(Attack.technique_id)
        .all()
    )

    return [{"technique": row[0], "count": row[1]} for row in data]
