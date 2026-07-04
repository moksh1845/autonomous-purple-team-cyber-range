from sqlalchemy import text

from database.db import SessionLocal


def log_action(
    username,
    action
):

    db = SessionLocal()

    try:

        db.execute(
            text(
                """
                INSERT INTO audit_logs
                (
                    username,
                    action
                )
                VALUES
                (
                    :username,
                    :action
                )
                """
            ),
            {
                "username": username,
                "action": action
            }
        )

        db.commit()

    finally:
        db.close()