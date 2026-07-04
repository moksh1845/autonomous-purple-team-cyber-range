"""
Real per-technique detection gap analysis.

The previous implementation computed a single global coverage_percent via
`min(total_detections, total_techniques) / total_techniques` — a numeric
trick, not a real gap analysis, and one that could never say *which*
techniques are undetected. It also returned a response shape
(`total_techniques`, `total_attacks`, `total_detections`, `coverage_percent`)
that did not match what the frontend (DetectionGaps.jsx) actually expects.

This version returns one row per technique that has been attacked at least
once, each marked tested / detected / Gap-or-Covered, plus the summary
fields the frontend already reads:
  coverage, executed_attacks, detected_attacks, missed_attacks, gaps[]
"""

from database.db import SessionLocal
from database.models import Technique, Attack, Detection


def calculate_detection_gaps() -> dict:
    db = SessionLocal()
    try:
        techniques = db.query(Technique).order_by(Technique.technique_id).all()

        gaps = []
        executed_attacks = 0
        detected_attacks = 0
        missed_attacks = 0

        for technique in techniques:
            attacks = (
                db.query(Attack)
                .filter(Attack.technique_id == technique.technique_id)
                .all()
            )

            tested = len(attacks) > 0
            technique_detected = False

            if tested:
                attack_ids = [a.id for a in attacks]
                technique_detected = (
                    db.query(Detection)
                    .filter(
                        Detection.attack_id.in_(attack_ids),
                        Detection.detected.is_(True),
                    )
                    .first()
                    is not None
                )

                executed_attacks += len(attacks)
                if technique_detected:
                    detected_attacks += len(attacks)
                else:
                    missed_attacks += len(attacks)

            gaps.append(
                {
                    "technique_id": technique.technique_id,
                    "technique_name": technique.technique_name,
                    "tactic": technique.tactic,
                    "tested": tested,
                    "detected": technique_detected,
                    "status": (
                        "Not Tested"
                        if not tested
                        else ("Covered" if technique_detected else "Gap")
                    ),
                }
            )

        coverage = (
            round((detected_attacks / executed_attacks) * 100, 2)
            if executed_attacks > 0
            else 0
        )

        return {
            "coverage": coverage,
            "executed_attacks": executed_attacks,
            "detected_attacks": detected_attacks,
            "missed_attacks": missed_attacks,
            "total_techniques": len(techniques),
            "gaps": gaps,
        }
    finally:
        db.close()
