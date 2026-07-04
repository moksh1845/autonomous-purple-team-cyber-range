"""
Unified Wazuh integration client.

Replaces the previous duplicated implementations that used to live in:
  - integrations/wazuh_client.py   (manager auth + agents, duplicated get_token())
  - services/wazuh_alerts.py       (duplicated get_token(), mislabeled "alerts")
  - services/wazuh_live_service.py (duplicated get_token() again)
  - integrations/wazuh_indexer.py  (separate indexer credentials/query)

All four used to hardcode the Wazuh host/credentials independently, which is
how the same password ended up copy-pasted into four files. There is now
exactly one place that authenticates to Wazuh, and exactly one place that
defines what "get the alerts" actually means.

Two real Wazuh subsystems are wrapped here:
  - Wazuh MANAGER REST API  (agents, manager status/logs) - token-based auth
  - Wazuh INDEXER / OpenSearch API (the actual alert documents) - basic auth

`get_alerts()` now queries the Indexer (`wazuh-alerts-*`), which is the
correct source for real alert data. The old behaviour -- calling
`/manager/status` and calling that "alerts" -- is gone.
"""

import time
from typing import Any, Dict, List, Optional

import requests
import urllib3

from config.settings import settings

if not settings.WAZUH_VERIFY_SSL or not settings.INDEXER_VERIFY_SSL:
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class WazuhClient:
    """Single entry point for every Wazuh manager/indexer call in the app."""

    def __init__(self):
        self._manager_host = settings.WAZUH_HOST.rstrip("/")
        self._manager_user = settings.WAZUH_USER
        self._manager_password = settings.WAZUH_PASSWORD
        self._manager_verify_ssl = settings.WAZUH_VERIFY_SSL

        self._indexer_host = settings.INDEXER_HOST.rstrip("/")
        self._indexer_user = settings.INDEXER_USER
        self._indexer_password = settings.INDEXER_PASSWORD
        self._indexer_verify_ssl = settings.INDEXER_VERIFY_SSL

        self._token: Optional[str] = None
        self._token_expires_at: float = 0.0

    # ------------------------------------------------------------------
    # Manager API authentication (cached -- Wazuh tokens are valid ~15 min)
    # ------------------------------------------------------------------
    def _get_token(self, force_refresh: bool = False) -> str:
        if not force_refresh and self._token and time.time() < self._token_expires_at:
            return self._token

        response = requests.post(
            f"{self._manager_host}/security/user/authenticate?raw=true",
            auth=(self._manager_user, self._manager_password),
            verify=self._manager_verify_ssl,
            timeout=10,
        )
        response.raise_for_status()

        self._token = response.text.strip()
        # Wazuh's default token TTL is 900s; refresh a little early.
        self._token_expires_at = time.time() + 800
        return self._token

    def _manager_headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self._get_token()}"}

    def _manager_get(self, path: str, params: Optional[dict] = None) -> dict:
        url = f"{self._manager_host}{path}"
        response = requests.get(
            url,
            headers=self._manager_headers(),
            params=params,
            verify=self._manager_verify_ssl,
            timeout=10,
        )
        if response.status_code == 401:
            # Token expired earlier than expected -- refresh once and retry.
            response = requests.get(
                url,
                headers={"Authorization": f"Bearer {self._get_token(force_refresh=True)}"},
                params=params,
                verify=self._manager_verify_ssl,
                timeout=10,
            )
        response.raise_for_status()
        return response.json()

    # ------------------------------------------------------------------
    # Manager API -- agents / manager health
    # ------------------------------------------------------------------
    def get_agents(self) -> dict:
        """GET /agents -- list of enrolled Wazuh agents and their status."""
        return self._manager_get("/agents")

    def get_manager_status(self) -> dict:
        """GET /manager/status -- daemon health, NOT alert data."""
        return self._manager_get("/manager/status")

    def get_manager_logs(self, limit: int = 100) -> dict:
        """GET /manager/logs -- manager log tail, used for the 'live' feed."""
        return self._manager_get("/manager/logs", params={"limit": limit})

    # ------------------------------------------------------------------
    # Indexer API -- the real alert documents
    # ------------------------------------------------------------------
    def get_alerts(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Query the Wazuh Indexer for the most recent real alert documents.
        This is the one and only correct source of "alerts" in the app --
        nothing here calls /manager/status anymore.
        """
        query = {
            "size": limit,
            "sort": [{"@timestamp": {"order": "desc"}}],
        }

        response = requests.get(
            f"{self._indexer_host}/wazuh-alerts-*/_search",
            auth=(self._indexer_user, self._indexer_password),
            json=query,
            verify=self._indexer_verify_ssl,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()

        hits = data.get("hits", {}).get("hits", [])
        alerts = []
        for hit in hits:
            source = hit.get("_source", {})
            alerts.append(
                {
                    "alert_id": hit.get("_id"),
                    "rule_id": str(source.get("rule", {}).get("id", "")),
                    "rule_description": source.get("rule", {}).get("description"),
                    "level": source.get("rule", {}).get("level"),
                    "agent_name": source.get("agent", {}).get("name"),
                    "timestamp": source.get("@timestamp"),
                    "full_log": source.get("full_log"),
                }
            )
        return alerts


# Module-level singleton -- every caller imports this same instance so the
# token cache is actually shared instead of re-authenticating on every call.
wazuh_client = WazuhClient()


# ---------------------------------------------------------------------------
# Thin functional wrappers kept ONLY so existing call sites
# (`from integrations.wazuh_client import get_agents, get_alerts`) keep working
# without touching every import across the codebase.
# ---------------------------------------------------------------------------
def get_agents() -> dict:
    return wazuh_client.get_agents()


def get_alerts(limit: int = 20) -> List[Dict[str, Any]]:
    return wazuh_client.get_alerts(limit=limit)


def get_manager_status() -> dict:
    return wazuh_client.get_manager_status()


def get_manager_logs(limit: int = 100) -> dict:
    return wazuh_client.get_manager_logs(limit=limit)
