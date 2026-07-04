"""
Client for the separate, custom Wazuh "collector" service (a small bridge
service expected to run on port 9000, outside this repo, that polls Wazuh
and exposes a simplified /alerts endpoint). This is independent from the
official Wazuh Manager/Indexer APIs wrapped by integrations/wazuh_client.py.

The collector URL is configurable via COLLECTOR_URL in .env — no hardcoded
IPs or credentials.
"""

import requests

from config.settings import settings


def get_alerts() -> list:
    response = requests.get(f"{settings.COLLECTOR_URL}/alerts", timeout=10)
    response.raise_for_status()
    return response.json()
