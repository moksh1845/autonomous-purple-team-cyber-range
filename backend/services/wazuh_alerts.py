"""
DEPRECATED — kept only for backward compatibility.

The previous implementation duplicated Wazuh manager authentication (with
hardcoded credentials) and called /manager/status, mislabeling that as
"alerts". Real alert retrieval now lives in integrations/wazuh_client.py.
"""

from integrations.wazuh_client import wazuh_client


def get_latest_alerts(limit: int = 20):
    return wazuh_client.get_alerts(limit=limit)
