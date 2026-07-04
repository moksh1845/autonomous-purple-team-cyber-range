import requests
from sqlalchemy import text

from config.settings import settings
from database.db import SessionLocal


def check_wazuh():
    try:
        response = requests.get(
            settings.INDEXER_HOST,
            auth=(settings.INDEXER_USER, settings.INDEXER_PASSWORD),
            verify=settings.INDEXER_VERIFY_SSL,
            timeout=5,
        )
        return response.status_code in (200, 401)
    except Exception:
        return False


def check_postgres():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
    finally:
        db.close()


def get_health():
    return {
        "wazuh": check_wazuh(),
        "postgres": check_postgres(),
        # No SOAR or threat-intel integration exists yet in this codebase --
        # reporting True for a system that doesn't exist is misleading on a
        # health endpoint. False until real integrations land (see roadmap).
        "soar": False,
        "threat_intel": False,
    }
