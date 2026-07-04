from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from database.db import get_db
from security.rbac import require_role

router = APIRouter()


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin"])),
):
    result = db.execute(
        text(
            """
            SELECT id, username, action, timestamp
            FROM audit_logs
            ORDER BY timestamp DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"limit": limit, "offset": offset},
    )

    return [
        {"id": row[0], "username": row[1], "action": row[2], "timestamp": row[3]}
        for row in result
    ]
