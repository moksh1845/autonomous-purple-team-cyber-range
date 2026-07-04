"""
Live manager log feed, used by routes/wazuh_live.py (`GET /wazuh/live-alerts`).

Previously duplicated its own Wazuh authentication with hardcoded
credentials. Now delegates to the single unified client.
"""

from integrations.wazuh_client import wazuh_client


def get_live_alerts() -> dict:
    try:
        return wazuh_client.get_manager_logs(limit=100)
    except Exception as e:
        return {"error": str(e)}
