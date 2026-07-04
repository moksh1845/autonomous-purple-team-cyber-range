import logging

from services.mitre_mapper import MITRE_RULES
from services.mitre_rule_loader import get_rules_for_technique

logger = logging.getLogger(__name__)


def matches_expected_rule(technique_id, alerts):
    """
    Low-level boolean check: does any alert's rule_id match one of the
    rule IDs expected for this technique?

    Renamed from validate_detection() -- that name collided with
    detectors.detection_manager.validate_detection (a different function,
    different signature, the real orchestrator), which made it easy to
    import the wrong one by mistake.

    Rule mapping source: tries the live Wazuh-ruleset-derived mapping
    first (services.mitre_rule_loader, covers every technique your
    ruleset actually maps), falling back to the static 4-entry
    MITRE_RULES dict only if Wazuh's /rules endpoint is unreachable --
    e.g. during local testing with no live Wazuh connection.
    """
    try:
        expected_rules = get_rules_for_technique(technique_id)
    except Exception as e:
        logger.warning(
            "Could not fetch live Wazuh rule mapping (%s); falling back to static MITRE_RULES.",
            e,
        )
        expected_rules = MITRE_RULES.get(technique_id, [])

    if not expected_rules:
        expected_rules = MITRE_RULES.get(technique_id, [])

    for alert in alerts:
        rule_id = str(alert.rule_id)
        if rule_id in expected_rules:
            return True

    return False
