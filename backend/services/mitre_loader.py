"""
Real MITRE ATT&CK Enterprise technique loader.

Previously the project's "MITRE mapping" was a hand-typed 5-entry dict
(attack_mappings/mitre_mapper.py) covering T1046, T1059, T1110, T1547,
T1003 only — a thin slice of the ~600+ real techniques/sub-techniques in
the framework. This module loads the *actual* MITRE ATT&CK Enterprise
matrix from the official STIX 2.0 bundle published at
https://github.com/mitre/cti, via the `mitreattack-python` library, and
seeds the techniques table from it.

Only top-level techniques are loaded (222 as of the current ATT&CK
release) — sub-techniques (~475 more) are deliberately excluded by
default, since tracking detection coverage at sub-technique granularity
is more detail than this project's attack-execution engine currently
supports. Pass `include_subtechniques=True` to load everything.

Usage:
    python -m services.mitre_loader                  # download + seed
    python -m services.mitre_loader --file path.json # use a local copy
"""

import argparse
import os
import sys
import urllib.request

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from database.db import SessionLocal, engine
from database.models import Technique

STIX_BUNDLE_URL = (
    "https://raw.githubusercontent.com/mitre/cti/master/"
    "enterprise-attack/enterprise-attack.json"
)

DEFAULT_LOCAL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "enterprise-attack.json"
)


def download_stix_bundle(destination: str = DEFAULT_LOCAL_PATH) -> str:
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    print(f"Downloading MITRE ATT&CK Enterprise STIX bundle to {destination} ...")
    urllib.request.urlretrieve(STIX_BUNDLE_URL, destination)
    print("Download complete.")
    return destination


def _extract_technique_id(stix_technique) -> str | None:
    for ref in stix_technique.get("external_references", []):
        if ref.get("source_name") == "mitre-attack":
            return ref.get("external_id")
    return None


def _extract_tactics(stix_technique) -> str:
    phases = stix_technique.get("kill_chain_phases", [])
    tactic_names = [
        p["phase_name"].replace("-", " ").title()
        for p in phases
        if p.get("kill_chain_name") == "mitre-attack"
    ]
    return ", ".join(tactic_names) if tactic_names else "Unknown"


def load_techniques_from_stix(
    stix_path: str, include_subtechniques: bool = False
) -> list[dict]:
    # Imported lazily so the rest of the backend doesn't require this
    # dependency unless someone actually runs the loader.
    from mitreattack.stix20 import MitreAttackData

    mitre_data = MitreAttackData(stix_path)
    raw_techniques = mitre_data.get_techniques(remove_revoked_deprecated=True)

    rows = []
    for t in raw_techniques:
        if not include_subtechniques and t.get("x_mitre_is_subtechnique", False):
            continue

        technique_id = _extract_technique_id(t)
        if not technique_id:
            continue

        rows.append(
            {
                "technique_id": technique_id,
                "technique_name": t.get("name", "Unknown"),
                "tactic": _extract_tactics(t),
            }
        )

    return rows


def seed_database(rows: list[dict]) -> int:
    """Upsert every row into the techniques table. Returns rows written."""
    db = SessionLocal()
    try:
        is_sqlite = engine.dialect.name == "sqlite"
        insert_fn = sqlite_insert if is_sqlite else pg_insert

        for row in rows:
            stmt = insert_fn(Technique).values(**row)
            stmt = stmt.on_conflict_do_update(
                index_elements=["technique_id"],
                set_={
                    "technique_name": row["technique_name"],
                    "tactic": row["tactic"],
                },
            )
            db.execute(stmt)

        db.commit()
        return len(rows)
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Seed the techniques table from real MITRE ATT&CK data.")
    parser.add_argument("--file", help="Path to a local enterprise-attack.json STIX bundle")
    parser.add_argument(
        "--include-subtechniques",
        action="store_true",
        help="Also load the ~475 sub-techniques (off by default)",
    )
    args = parser.parse_args()

    stix_path = args.file
    if not stix_path:
        if os.path.exists(DEFAULT_LOCAL_PATH):
            stix_path = DEFAULT_LOCAL_PATH
        else:
            stix_path = download_stix_bundle()

    rows = load_techniques_from_stix(stix_path, include_subtechniques=args.include_subtechniques)
    written = seed_database(rows)
    print(f"Seeded {written} MITRE ATT&CK techniques into the database.")


if __name__ == "__main__":
    main()
