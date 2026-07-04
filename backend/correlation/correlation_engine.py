"""
Live (real-time, non-DB) correlation: checks the most recent Wazuh alerts
*right now* against keyword heuristics for a technique.

Previously this called get_alerts() expecting a Wazuh manager-API shape
(`{"data": {"affected_items": [...]}}`) but the underlying call actually hit
`/manager/status` (daemon health), which can never contain attack-related
keywords — so this function was structurally guaranteed to always return
detected=False.

It now calls the unified Wazuh client's get_alerts(), which queries the
real Wazuh Indexer (`wazuh-alerts-*`) and returns a flat list of alert
dicts with rule_description / full_log fields to match keywords against.

This endpoint is for a quick "is anything matching right now" live check.
For the authoritative, persisted, time-windowed correlation of a specific
attack, use services/correlate_attack.py (`/correlate-attack/{attack_id}`)
instead — that is the source of truth written to the detections table.
"""

from integrations.wazuh_client import get_alerts

MITRE_KEYWORDS = {
    "T1046": ["network", "scan", "discovery"],
    "T1059": ["powershell", "cmd", "command"],
    "T1110": ["brute", "authentication", "login failed"],
    "T1547": ["registry", "startup", "persistence"],
    "T1003": ["credential", "lsass", "dump"],
}


def correlate_attack(technique_id: str, limit: int = 50) -> dict:
    keywords = MITRE_KEYWORDS.get(technique_id, [])

    try:
        alerts = get_alerts(limit=limit)
    except Exception as e:
        return {
            "detected": False,
            "technique_id": technique_id,
            "matched_keyword": None,
            "confidence": 0,
            "mode": "simulated",
            "reason": f"Could not reach Wazuh: {e}",
        }

    for alert in alerts:
        text = " ".join(
            str(alert.get(field, ""))
            for field in ("rule_description", "full_log")
        ).lower()

        for keyword in keywords:
            if keyword.lower() in text:
                return {
                    "detected": True,
                    "technique_id": technique_id,
                    "matched_keyword": keyword,
                    "matched_rule_id": alert.get("rule_id"),
                    "confidence": 95,
                    "mode": "live",
                }

    return {
        "detected": False,
        "technique_id": technique_id,
        "matched_keyword": None,
        "confidence": 0,
        "mode": "live",
    }
