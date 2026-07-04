"""
Build the technique_id -> [rule_ids] mapping from Wazuh's OWN ruleset,
instead of a hand-typed 4-entry dict (the old attack_mappings/mitre_mapper.py
MITRE_RULES only covered T1046/T1059/T1003/T1547 -- detection correlation
was structurally impossible for the other ~218 of the 222 real MITRE
techniques loaded via services/mitre_loader.py, regardless of what Wazuh
actually detected).

Wazuh rules carry their own <mitre><id>T1110</id></mitre> tags when they
have ATT&CK mappings. Querying GET /rules directly keeps this mapping in
sync with whatever ruleset (including any custom rules you add) the
manager actually runs, rather than a static guess.

Usage:
    python -m services.mitre_rule_loader     # fetch + print summary
"""

import time
from collections import defaultdict

from integrations.wazuh_client import wazuh_client

_CACHE: dict[str, list[str]] = {}
_CACHE_BUILT_AT: float = 0.0
_CACHE_TTL_SECONDS = 3600  # refresh hourly -- rulesets don't change often


def build_technique_rule_map(force_refresh: bool = False) -> dict[str, list[str]]:
    global _CACHE, _CACHE_BUILT_AT

    if not force_refresh and _CACHE and (time.time() - _CACHE_BUILT_AT) < _CACHE_TTL_SECONDS:
        return _CACHE

    mapping: dict[str, list[str]] = defaultdict(list)
    offset = 0
    limit = 500

    while True:
        response = wazuh_client._manager_get(
            "/rules",
            params={"limit": limit, "offset": offset, "select": "id,mitre"},
        )
        items = response.get("data", {}).get("affected_items", [])
        if not items:
            break

        for rule in items:
            for mitre_id in rule.get("mitre", {}).get("id", []):
                mapping[mitre_id].append(str(rule["id"]))

        if len(items) < limit:
            break
        offset += limit

    _CACHE = dict(mapping)
    _CACHE_BUILT_AT = time.time()
    return _CACHE


def get_rules_for_technique(technique_id: str) -> list[str]:
    """Drop-in replacement for the old MITRE_RULES.get(technique_id, [])."""
    return build_technique_rule_map().get(technique_id, [])


if __name__ == "__main__":
    mapping = build_technique_rule_map(force_refresh=True)
    print(f"Built rule mapping for {len(mapping)} MITRE techniques from live Wazuh ruleset.")
    for technique_id, rule_ids in sorted(mapping.items())[:10]:
        print(f"  {technique_id}: {rule_ids}")
