"""
DEPRECATED — kept only for backward compatibility with any external script
that still imports `get_recent_alerts` from this module.

The real implementation now lives in integrations/wazuh_client.py
(WazuhClient.get_alerts), which is the single source of truth for Wazuh
credentials and queries. Do not add new logic here.
"""

from integrations.wazuh_client import wazuh_client


def get_recent_alerts(limit: int = 20):
    """Thin compatibility wrapper around the unified Wazuh client."""
    return wazuh_client.get_alerts(limit=limit)
