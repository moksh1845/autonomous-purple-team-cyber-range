from integrations.wazuh_collector_client import get_alerts

from database.db import SessionLocal
from database.models import WazuhAlert


def store_alerts():

    db = SessionLocal()
    try:
        alerts = get_alerts()

        count = 0

        for alert in alerts:

            exists = db.query(WazuhAlert).filter(
                WazuhAlert.timestamp == alert["timestamp"],
                WazuhAlert.rule_id == alert["rule_id"]
            ).first()

            if exists:
                continue

            new_alert = WazuhAlert(
                alert_id=f"{alert['rule_id']}_{alert['timestamp']}",
                rule_id=alert["rule_id"],
                rule_description=alert["rule_description"],
                level=alert["level"],
                agent_name=alert["agent"],
                timestamp=alert["timestamp"],
                full_log=str(alert)
            )

            db.add(new_alert)

            count += 1

        db.commit()

        return {
            "stored_alerts": count
        }
    finally:
        db.close()