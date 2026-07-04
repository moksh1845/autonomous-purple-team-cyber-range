"""
Real Atomic Red Team execution via Invoke-AtomicRedTeam (PowerShell module).

Why PowerShell and not the Python `atomic-operator` package: atomic-operator
requires pydantic<2.0, which directly conflicts with this project's FastAPI
(pydantic>=2.9) -- confirmed by attempting the install (pip's resolver
reports the conflict), not assumed. Shelling out to PowerShell keeps Atomic
Red Team execution in an isolated process with its own dependencies, which
is also closer to how Invoke-AtomicRedTeam is actually deployed in real
purple team environments (it's the canonical tool for Windows technique
execution, maintained by Red Canary).

This REPLACES the previous version of this file, which hardcoded 5
unrelated OS commands (whoami, ipconfig, net user, reg query, tasklist) as
stand-ins for real MITRE techniques -- none of those commands actually
simulate the adversary behavior their assigned technique IDs represent.

Prerequisites on the target Windows machine (run once, as Administrator):
    Install-Module -Name invoke-atomicredteam,powershell-yaml -Scope CurrentUser -Force
    Install-AtomicRedTeam -getAtomics

This module must be installed on whichever machine actually executes the
attack (the target being monitored by a Wazuh agent), not necessarily on
the machine running the FastAPI backend, unless they're the same host in
your lab.
"""

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


class AtomicExecutionError(Exception):
    pass


# Root of the local Atomic Red Team atomics checkout on the executing
# Windows host. This matches the default path used by
# Install-AtomicRedTeam -getAtomics.
ATOMICS_ROOT = Path(r"C:\AtomicRedTeam\atomics")

# Some technique IDs that exist in a broader ATT&CK dataset (e.g. parent
# techniques like T1595) don't have a matching folder in Atomic Red Team --
# only a specific sub-technique does (e.g. T1595.003). This mapping lets the
# frontend keep sending the parent ID while we transparently execute the
# sub-technique that actually has atomics defined.
#
# Add more entries here as other gaps between the ATT&CK dataset and Atomic
# Red Team's actual coverage are discovered.
ATOMIC_MAPPING = {
    "T1595": "T1595.003",
}

# Technique IDs look like T#### or T####.### -- validate the shape before
# building filesystem paths or shelling out to PowerShell with them.
_TECHNIQUE_ID_PATTERN = re.compile(r"^T\d{4}(\.\d{3})?$", re.IGNORECASE)


def _resolve_technique_id(technique_id: str) -> str:
    """Apply ATOMIC_MAPPING, falling back to the original ID unchanged."""
    return ATOMIC_MAPPING.get(technique_id, technique_id)


def _is_valid_technique_id(technique_id: str) -> bool:
    return bool(_TECHNIQUE_ID_PATTERN.match(technique_id or ""))


def _atomic_yaml_path(technique_id: str) -> Path:
    """Path to the YAML definition Atomic Red Team expects for a technique."""
    return ATOMICS_ROOT / technique_id / f"{technique_id}.yaml"


def _atomic_technique_exists(technique_id: str) -> bool:
    """
    Check that Atomic Red Team actually has a definition for this technique
    on disk, e.g. C:\\AtomicRedTeam\\atomics\\T1595.003\\T1595.003.yaml.

    This is what prevents us from calling Invoke-AtomicTest on a technique
    ID that has no atomics at all (like the bare parent T1595), which
    previously silently returned "No atomic tests executed".
    """
    return _atomic_yaml_path(technique_id).is_file()


def _run_powershell(script: str, timeout: int = 60) -> str:
    """Run a PowerShell snippet and return its stdout, raising on failure."""
    result = subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if result.returncode != 0:
        raise AtomicExecutionError(result.stderr.strip() or "Unknown PowerShell error")
    return result.stdout


def _check_prereqs(technique_id: str, timeout: int = 60) -> Optional[dict]:
    """
    Run `Invoke-AtomicTest <technique> -CheckPrereqs` before actually
    executing anything. Returns None if prereqs pass (or if the check
    itself can't be interpreted cleanly and we choose to proceed and let
    execution surface the real error), or a failed-status dict if prereqs
    are clearly unmet.
    """
    script = f"""
    $ErrorActionPreference = 'Stop'
    Import-Module invoke-atomicredteam -ErrorAction Stop
    Invoke-AtomicTest {technique_id} -CheckPrereqs -ErrorAction Stop
    """
    try:
        output = _run_powershell(script, timeout=timeout)
    except AtomicExecutionError as e:
        return {
            "status": "failed",
            "technique_id": technique_id,
            "message": (
                f"Prerequisite check failed for {technique_id}: {e}. "
                "Confirm invoke-atomicredteam is installed on this machine "
                "(Install-Module -Name invoke-atomicredteam,powershell-yaml) "
                "and atomics are present (Install-AtomicRedTeam -getAtomics)."
            ),
        }
    except subprocess.TimeoutExpired:
        return {
            "status": "failed",
            "technique_id": technique_id,
            "message": f"Prerequisite check for {technique_id} timed out after {timeout}s.",
        }

    # Invoke-AtomicTest with -CheckPrereqs prints "Prerequisites not met"
    # (in various phrasings) per test when something's missing, and doesn't
    # otherwise fail the process, so we scan the text output for that.
    lowered = output.lower()
    if "prereq" in lowered and ("not met" in lowered or "failed" in lowered):
        return {
            "status": "failed",
            "technique_id": technique_id,
            "message": (
                f"Prerequisites not met for {technique_id}. "
                "Run `Invoke-AtomicTest "
                f"{technique_id} -CheckPrereqs` manually in PowerShell to "
                "see the specific missing dependency, or add "
                "`-GetPrereqs` to install it."
            ),
        }

    return None


def list_atomic_tests(technique_id: str) -> list:
    """
    Return the available Atomic Red Team test definitions for a technique
    (e.g. T1110 has multiple numbered tests -- #1, #2, #3 -- each a distinct
    attack variant). Lets the frontend show the user a real choice instead
    of guessing which test to run.
    """
    technique_id = _resolve_technique_id(technique_id)

    if not _is_valid_technique_id(technique_id):
        return []

    if not _atomic_technique_exists(technique_id):
        return []

    script = f"""
    $ErrorActionPreference = 'Stop'
    Import-Module invoke-atomicredteam -ErrorAction Stop
    $tests = Invoke-AtomicTest {technique_id} -ShowDetailsBrief -ErrorAction Stop
    $tests | ConvertTo-Json -Depth 4
    """
    try:
        output = _run_powershell(script)
    except (AtomicExecutionError, subprocess.TimeoutExpired):
        return []

    try:
        parsed = json.loads(output)
        return parsed if isinstance(parsed, list) else [parsed]
    except json.JSONDecodeError:
        return []


def execute_attack(technique_id: str, test_numbers: Optional[list] = None) -> dict:
    """
    Run real Atomic Red Team test(s) for technique_id via Invoke-AtomicTest.

    test_numbers: specific atomic test indices to run (e.g. [1, 2]). If
    None, Invoke-AtomicTest runs every test defined for the technique.

    Returns a dict describing what actually happened -- including real
    stdout/stderr from the executed attack, and an honest status. If
    Invoke-AtomicRedTeam isn't installed or the technique has no defined
    atomics, this returns status="failed" with a clear message -- it does
    NOT fall back to a fake command, which is the exact anti-pattern this
    replaces.
    """
    original_technique_id = technique_id

    # --- 1. Technique mapping -------------------------------------------
    # Some IDs from the broader ATT&CK dataset (e.g. parent technique
    # T1595) don't map to an actual Atomic Red Team folder -- only a
    # sub-technique does (e.g. T1595.003). Resolve that up front so every
    # check and log entry below refers to the technique we'll actually run.
    technique_id = _resolve_technique_id(technique_id)

    # --- Basic shape validation ------------------------------------------
    if not _is_valid_technique_id(technique_id):
        return {
            "status": "failed",
            "technique_id": original_technique_id,
            "message": (
                f"'{original_technique_id}' is not a valid MITRE ATT&CK "
                "technique ID (expected format T#### or T####.###)."
            ),
        }

    # --- 2. Validate the technique actually exists in Atomic Red Team ----
    if not _atomic_technique_exists(technique_id):
        return {
            "status": "failed",
            "technique_id": original_technique_id,
            "message": "Atomic technique not available",
        }

    # --- 3. Check prerequisites before touching anything ------------------
    prereq_failure = _check_prereqs(technique_id)
    if prereq_failure is not None:
        # Preserve the original requested ID in the response for the
        # frontend, but keep the resolved ID visible in the message so
        # engineers can tell what was actually checked.
        if original_technique_id != technique_id:
            prereq_failure["message"] = (
                f"(mapped {original_technique_id} -> {technique_id}) "
                + prereq_failure["message"]
            )
            prereq_failure["technique_id"] = original_technique_id
        return prereq_failure

    # --- 4. Execute -------------------------------------------------------
    test_arg = ""
    if test_numbers:
        test_arg = f"-TestNumbers {','.join(str(n) for n in test_numbers)}"

    script = f"""
    $ErrorActionPreference = 'Stop'
    Import-Module invoke-atomicredteam -ErrorAction Stop
    $logPath = Join-Path $env:TEMP "atomic_exec_log.json"
    if (Test-Path $logPath) {{ Remove-Item $logPath -Force }}
    Invoke-AtomicTest {technique_id} {test_arg} -ExecutionLogPath $logPath -ErrorAction Stop
    if (Test-Path $logPath) {{ Get-Content $logPath -Raw }}
    """

    try:
        raw_output = _run_powershell(script, timeout=120)
    except AtomicExecutionError as e:
        return {
            "status": "failed",
            "technique_id": original_technique_id,
            "message": (
                f"Atomic Red Team execution failed: {e}. "
                "Confirm invoke-atomicredteam is installed on this machine "
                "(Install-Module -Name invoke-atomicredteam,powershell-yaml) "
                "and atomics are present (Install-AtomicRedTeam -getAtomics)."
            ),
        }
    except subprocess.TimeoutExpired:
        return {
            "status": "failed",
            "technique_id": original_technique_id,
            "message": "Atomic Red Team execution timed out after 120s.",
        }

    # Invoke-AtomicTest writes one JSON object per executed test step to the
    # execution log -- parse whatever's there rather than assuming a single
    # object, since multi-test techniques produce multiple log lines.
    executed_steps = []
    for line in raw_output.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            executed_steps.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    if not executed_steps:
        return {
            "status": "failed",
            "technique_id": original_technique_id,
            "message": (
                "No atomic tests executed -- technique may have no defined "
                "atomics, or all prerequisites failed (run Invoke-AtomicTest "
                f"{technique_id} manually in PowerShell to see why)."
            ),
        }

    return {
        "status": "success",
        "technique_id": original_technique_id,
        "executed_at": datetime.now(timezone.utc).isoformat(),
        "steps": executed_steps,
        "output": json.dumps(executed_steps, indent=2),
    }