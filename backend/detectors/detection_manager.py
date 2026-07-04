"""
Real detection validation.

This module used to return a hardcoded dict with detected=True for every
technique, regardless of whether anything actually happened in Wazuh. That
is gone. validate_detection() now:

  1. Looks up the most recent Attack row for the given technique_id.
  2. Runs the real correlation path (services.correlate_attack) against the
     WazuhAlert table for that attack.
  3. Returns mode="live" with the genuine detected/rule_id/latency result.

If there is no Wazuh alert data to correlate against at all (e.g. Wazuh is
down, or no agent has ever reported), it returns mode="simulated" with
detected=False and says so explicitly, instead of silently fabricating a
"success".

IMPORTANT for callers: services.correlate_attack.correlate_attack() already
persists its own Detection row (it's also used standalone by the
/correlate-attack/{attack_id} endpoint, where that's the whole point). So
when this function's "live" path runs, a Detection row has ALREADY been
written to the database by the time it returns. The returned dict includes
"persisted": True in that case -- callers (main.py's /execute,
routes/simulations.py's /simulate) MUST check this and skip creating their
own additional Detection row, or every live-mode result gets written twice.
"""

from datetime import datetime, timezone

from database.db import SessionLocal
from database.models import Attack, WazuhAlert
from services.correlate_attack import correlate_attack


def _wazuh_has_any_data(db) -> bool:
    """True if the wazuh_alerts table has ever received a single real alert."""
    return db.query(WazuhAlert.id).first() is not None


def validate_detection(technique_id: str) -> dict:
    db = SessionLocal()
    try:
        attack = (
            db.query(Attack)
            .filter(Attack.technique_id == technique_id)
            .order_by(Attack.execution_time.desc())
            .first()
        )

        if not attack:
            return {
                "mode": "simulated",
                "source": "none",
                "rule_id": None,
                "detected": False,
                "latency_seconds": None,
                "reason": "No attack execution found for this technique.",
                "persisted": False,
            }

        if not _wazuh_has_any_data(db):
            # Be honest: we have nothing real to correlate against.
            return {
                "mode": "simulated",
                "source": "none",
                "rule_id": None,
                "detected": False,
                "latency_seconds": None,
                "reason": "Wazuh has not ingested any alerts yet — cannot validate live.",
                "persisted": False,
            }

        correlation_result = correlate_attack(attack.id)

        if "error" in correlation_result:
            return {
                "mode": "simulated",
                "source": "none",
                "rule_id": None,
                "detected": False,
                "latency_seconds": None,
                "reason": correlation_result["error"],
                "persisted": False,
            }

        latency_seconds = None
        if correlation_result.get("detected") and attack.execution_time:
            now = datetime.now(timezone.utc)
            exec_time = attack.execution_time
            if exec_time.tzinfo is None:
                exec_time = exec_time.replace(tzinfo=timezone.utc)
            latency_seconds = max(0, int((now - exec_time).total_seconds()))

        return {
            "mode": "live",
            "source": "Wazuh",
            "rule_id": correlation_result.get("matched_rule_id"),
            "detected": correlation_result.get("detected", False),
            "latency_seconds": latency_seconds,
            "alerts_checked": correlation_result.get("alerts_found", 0),
            # correlate_attack() above already INSERTed and committed its own
            # Detection row for this attack -- callers must not create another.
            "persisted": True,
        }
    finally:
        db.close()