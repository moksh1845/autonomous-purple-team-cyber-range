"""
Continuous Wazuh alert collector.

Polls the Wazuh Indexer every 30 seconds, fetches real alerts,
and writes new ones into the wazuh_alerts Postgres table.
This is the bridge between Wazuh and your Purple Team Cyber Range.

Run this in a separate terminal while the backend is running:
    cd backend
    python run_collector.py
"""

import time
import logging
from datetime import datetime, timezone

from database.db import SessionLocal
from database.models import WazuhAlert
from integrations.wazuh_client import wazuh_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 30
ALERTS_PER_POLL = 50


def collect_and_store():
    """Fetch latest alerts from Wazuh Indexer and write new ones to DB."""
    db = SessionLocal()
    try:
        alerts = wazuh_client.get_alerts(limit=ALERTS_PER_POLL)

        new_count = 0
        skip_count = 0

        for alert in alerts:
            alert_id = alert.get("alert_id")
            if not alert_id:
                continue

            # Skip if already stored (alert_id is unique in the table)
            exists = db.query(WazuhAlert).filter(
                WazuhAlert.alert_id == alert_id
            ).first()

            if exists:
                skip_count += 1
                continue

            # Parse timestamp — Wazuh Indexer returns ISO 8601 strings
            raw_ts = alert.get("timestamp")
            parsed_ts = None
            if raw_ts:
                try:
                    parsed_ts = datetime.fromisoformat(
                        raw_ts.replace("Z", "+00:00")
                    )
                except ValueError:
                    parsed_ts = datetime.now(timezone.utc)

            new_alert = WazuhAlert(
                alert_id=alert_id,
                rule_id=str(alert.get("rule_id") or ""),
                rule_description=alert.get("rule_description"),
                level=alert.get("level"),
                agent_name=alert.get("agent_name"),
                timestamp=parsed_ts,
                full_log=alert.get("full_log"),
            )

            db.add(new_alert)
            new_count += 1

        db.commit()

        if new_count > 0:
            logger.info(
                "Stored %d new alert(s) — skipped %d already-seen",
                new_count, skip_count
            )
        else:
            logger.debug("No new alerts (all %d already stored)", skip_count)

        return new_count

    except Exception as e:
        logger.error("Collection error: %s", e)
        db.rollback()
        return 0
    finally:
        db.close()


def main():
    logger.info(
        "Wazuh alert collector starting — polling every %ds",
        POLL_INTERVAL_SECONDS
    )
    logger.info(
        "Indexer: %s", wazuh_client._indexer_host
    )

    consecutive_errors = 0

    while True:
        try:
            new = collect_and_store()
            consecutive_errors = 0
        except Exception as e:
            consecutive_errors += 1
            logger.error(
                "Unhandled error #%d: %s", consecutive_errors, e
            )
            if consecutive_errors >= 5:
                logger.critical(
                    "5 consecutive errors — check Wazuh/DB connectivity"
                )

        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()