"""
Correlate a single Attack with real Wazuh alert data stored in the
wazuh_alerts table, and persist the resulting Detection row.

Time window: detection latency in a real environment is typically seconds
to low minutes. The previous +/-30 minute window was a debugging workaround
("Expanded time window for testing") left in by mistake — it produces false
positive correlations once more than one attack runs per hour. Tightened to
a realistic +/-5 minute window.
"""

import logging
from datetime import timedelta

from services.detection_validator import matches_expected_rule
from database.db import SessionLocal
from database.models import Attack, Detection, WazuhAlert

logger = logging.getLogger(__name__)

CORRELATION_WINDOW_MINUTES = 5


def correlate_attack(attack_id: int) -> dict:
    db = SessionLocal()
    try:
        attack = db.query(Attack).filter(Attack.id == attack_id).first()

        if not attack:
            return {"error": "Attack not found"}

        attack_time = attack.execution_time
        start_time = attack_time - timedelta(minutes=CORRELATION_WINDOW_MINUTES)
        end_time = attack_time + timedelta(minutes=CORRELATION_WINDOW_MINUTES)

        alerts = (
            db.query(WazuhAlert)
            .filter(
                WazuhAlert.timestamp >= start_time,
                WazuhAlert.timestamp <= end_time,
            )
            .all()
        )

        logger.debug(
            "Correlating technique=%s attack_time=%s window=[%s, %s] alerts_found=%d",
            attack.technique_id, attack_time, start_time, end_time, len(alerts),
        )

        detected = matches_expected_rule(attack.technique_id, alerts)

        matched_alert = None
        if detected:
            expected_rules = None
            from services.mitre_mapper import MITRE_RULES
            expected_rules = set(MITRE_RULES.get(attack.technique_id, []))
            matched_alert = next(
                (a for a in alerts if str(a.rule_id) in expected_rules), None
            )

        latency_seconds = None
        if matched_alert and matched_alert.timestamp and attack_time:
            latency_seconds = max(
                0, int((matched_alert.timestamp - attack_time).total_seconds())
            )

        detection = Detection(
            attack_id=attack.id,
            wazuh_alert_id=matched_alert.id if matched_alert else None,
            source="Wazuh",
            rule_id=matched_alert.rule_id if matched_alert else None,
            detected=detected,
            latency_seconds=latency_seconds,
        )

        db.add(detection)
        db.commit()

        return {
            "attack_id": attack.id,
            "technique_id": attack.technique_id,
            "detected": detected,
            "alerts_found": len(alerts),
            "matched_rule_id": matched_alert.rule_id if matched_alert else None,
            "latency_seconds": latency_seconds,
        }
    finally:
        db.close()
