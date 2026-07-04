# Implementation Report — Pass 2 (Wazuh 4.14.5 / Atomic Red Team Integration)

Every fix below was actually written, compiled, and functionally tested in a
sandbox (pytest, direct model creation against SQLite, mocked end-to-end
`/execute` and `/simulate` calls, and offline Postgres-dialect SQL generation
for the new migration) — not just generated. Verification output is quoted
where relevant.

---

## Critical fixes (regressions from the previous pass)

**A1 — Alembic `%` encoding crash, reintroduced.**
`backend/alembic/env.py` had reverted to passing `settings.DATABASE_URL`
straight into `config.set_main_option()` with no escaping, which crashes
against any password containing `%` (e.g. `Rohit%4045`) due to
`configparser`'s interpolation syntax. Restored the `.replace("%", "%%")`
fix.

**A2 — Real credentials physically present in the ZIP.**
Both `.env` (root) and `backend/.env` contained real, working secrets
(`SECRET_KEY`, `WAZUH_PASSWORD`, `INDEXER_PASSWORD`). Both replaced with
`CHANGE_ME` placeholder templates — same pattern as `.env.example`, since
these files should never have been zipped with real values in the first
place. **You must re-fill these with your real Wazuh 4.14.5 credentials
before running the app** — see "What you need to do" below.

**A3 — `services/health_service.py` hardcoded a literal placeholder
password and the decommissioned Wazuh 4.7 host.**
`check_wazuh()` authenticated with the literal string `"YOUR_INDEXER_PASSWORD"`
against `192.168.56.107:9200` — meaning `/health`'s `wazuh` field was
permanently `False` against any real Indexer, and pointed at a host that no
longer exists per your brief. Rewritten to use `settings.INDEXER_HOST` /
`settings.INDEXER_USER` / `settings.INDEXER_PASSWORD`. Also changed `"soar"`
and `"threat_intel"` from hardcoded `True` to `False`, since reporting a
healthy status for subsystems that don't exist in this codebase is
misleading on a health endpoint.

**A4 — `.env` files referenced the old `192.168.56.107` Wazuh 4.7 host.**
Both updated to `10.0.2.15` (Wazuh 4.14.5, per your brief).

---

## High severity fixes

**B1 — The attack execution engine was 5 hardcoded OS commands, not
Atomic Red Team.** This was the core gap. `backend/orchestrator/attack_manager.py`
mapped `T1046 → "whoami"`, `T1003 → "tasklist"`, etc. — harmless lookalike
commands with no relationship to real adversary behavior for those
technique IDs.

**Replaced entirely** with real Atomic Red Team execution via
**Invoke-AtomicRedTeam** (the PowerShell module — the canonical tool for
Windows technique execution, maintained by Red Canary). This is not the
Python `atomic-operator` package — I attempted installing that directly
and it failed with a hard dependency conflict:
```
atomic-operator-runner 0.2.1 requires pydantic<2.0.0,>=1.10.1,
but you have pydantic 2.13.4 which is incompatible.
```
This is a real, verified conflict (FastAPI requires `pydantic>=2.9`), not
a guess — confirmed by attempting the install and watching pip's own
resolver report it. The PowerShell approach avoids this entirely by
running Atomic Red Team in an isolated process with its own dependencies,
which also matches how Invoke-AtomicRedTeam is actually deployed in real
purple team labs.

New `orchestrator/attack_manager.py` shells out to `Invoke-AtomicTest`,
parses its real JSON execution log, and returns honest `status: "failed"`
with a clear message if the module isn't installed or a technique has no
defined atomics — it does **not** fall back to a fake command.

**Prerequisite you must run once on the Windows target machine, as
Administrator:**
```powershell
Install-Module -Name invoke-atomicredteam,powershell-yaml -Scope CurrentUser -Force
Install-AtomicRedTeam -getAtomics
```

**B2 — Two parallel, divergent attack-execution code paths.**
`main.py`'s `/execute/{technique_id}` and `routes/simulations.py`'s
`/simulate` each had their own copy of attack-creation + detection-validation
logic. This duplication is exactly what let the original `SIM-001`
hardcoded-detection bug exist in only one of the two paths without being
caught.

**Consolidated into one shared `services/execution_service.py`**, used by
both routes. New database table `atomic_executions` stores the real
per-step data from each Atomic Red Team test (command run, exit code, raw
output) — not a synthetic summary.

**Verified end-to-end** (PowerShell mocked, since it's unavailable in this
sandbox — the FastAPI/DB layer around it is fully real and tested):
```
POST /execute/T1110 -> 200
{
  "success": true, "attack_id": 1, "technique_id": "T1110",
  "atomic_output": "[{\"TestNumber\": 1}]",
  "detection": {"mode": "simulated", "detected": false, ...}
}
POST /simulate -> 200
{ ...same shared logic, plus "technique_name": "Brute Force" }

atomic_executions rows: [(1, 1, 'Brute Force - Local Account',
                           'net user test /add', 0), ...]
```
Both routes now produce identical detection semantics and write to the
same real `atomic_executions` table — no more drift possible between them.

**B3 — MITRE rule mapping only covered 4 of 222 loaded techniques.**
`attack_mappings/mitre_mapper.py`'s `MITRE_RULES` dict only had entries
for `T1046`/`T1059`/`T1003`/`T1547`. Detection correlation was
structurally impossible for the other ~218 techniques regardless of what
Wazuh actually detected.

**New file `services/mitre_rule_loader.py`** queries Wazuh's own
`GET /rules` endpoint directly, reading each rule's `<mitre><id>` tags —
this keeps the mapping in sync with your actual ruleset (including any
custom rules), rather than a static guess. `detection_validator.py` now
tries this live mapping first, falling back to the static 4-entry dict
only if Wazuh's `/rules` endpoint is unreachable. **Verified the fallback
path explicitly:**
```
Could not fetch live Wazuh rule mapping (...timed out...);
falling back to static MITRE_RULES.
Fallback to static MITRE_RULES works: True
```

**B4 — Two different, disagreeing "risk score" algorithms.**
`main.py`'s `/risk-score` used a hardcoded 5-technique severity dict,
while `services/risk_score.py` had a completely different, entirely
unused coverage-inverse algorithm (`risk = 100 - coverage`) sitting dead
(confirmed zero call sites). `main.py`'s route now imports and calls the
real `services/risk_score.py` implementation instead of duplicating logic
— one canonical risk metric instead of two that could silently disagree.

**B5 — Naming collision between two different `validate_detection`
functions.** `detectors/detection_manager.py::validate_detection(technique_id)`
(the real orchestrator) and `services/detection_validator.py::validate_detection(technique_id, alerts)`
(a low-level rule-matcher) shared a name with different signatures —
exactly the kind of thing that causes a future import of the wrong
function. Renamed the low-level one to `matches_expected_rule()`, updated
its one call site in `correlate_attack.py`.

---

## Medium severity fixes

**C3 — `Simulation.completed_at` was structurally identical to
`started_at`.** Both columns defaulted to `func.now()` at INSERT time, so
`completed_at` never actually reflected when execution finished. Removed
the server-side default; it's now set explicitly in code only when
`execution_service.py` finishes a run. **Verified directly:**
```
Simulation started_at: 2026-06-30 08:21:47
Simulation completed_at (should be None, not auto-set): None
```

**New Alembic migration `7f3a9c2e1b44_add_atomic_executions_table.py`**
covers both the new table and the `completed_at` fix. Hand-written
(not autogenerated against SQLite, which would have produced
SQLite-specific DDL incompatible with your real Postgres) and verified by
generating the actual offline Postgres SQL it produces:
```sql
CREATE TABLE atomic_executions (
    id SERIAL NOT NULL,
    attack_id INTEGER,
    atomic_test_number INTEGER,
    atomic_test_name VARCHAR(255),
    command_executed TEXT,
    exit_code INTEGER,
    raw_output TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (id),
    FOREIGN KEY(attack_id) REFERENCES attacks (id) ON DELETE CASCADE
);
CREATE INDEX ix_atomic_executions_attack_id ON atomic_executions (attack_id);
ALTER TABLE simulations ALTER COLUMN completed_at DROP DEFAULT;
```
Correctly chained after your existing migration head (`1d54d0780dd2`) —
confirmed via `alembic heads` / `alembic history`.

---

## Full test suite — all 28 tests still pass after every change
```
======================= 28 passed, 5 warnings in 11.91s ========================
```

---

## What you need to do before running this

1. **Fill in real values** in both `.env` (root) and `backend/.env` —
   they currently contain only `CHANGE_ME` placeholders:
   - `SECRET_KEY` — generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"`
   - `POSTGRES_PASSWORD` / `DATABASE_URL` password — your real, rotated Postgres password
   - `WAZUH_PASSWORD`, `INDEXER_PASSWORD` — your real Wazuh 4.14.5 credentials (host is already correctly set to `10.0.2.15`)

2. **Run the new migration:**
   ```
   cd backend
   alembic upgrade head
   ```

3. **Install Invoke-AtomicRedTeam on your Windows target** (the machine
   that will actually execute attacks, monitored by a Wazuh agent):
   ```powershell
   Install-Module -Name invoke-atomicredteam,powershell-yaml -Scope CurrentUser -Force
   Install-AtomicRedTeam -getAtomics
   ```
   Test it standalone before wiring it into the API:
   ```powershell
   Invoke-AtomicTest T1110 -ShowDetailsBrief
   ```

4. **(Optional but recommended) Build the live Wazuh rule mapping once
   manually** to confirm `/rules` is reachable from wherever the backend
   runs:
   ```
   python -m services.mitre_rule_loader
   ```

---

## What was NOT built in this pass, and why

Your brief asked for SOAR, TheHive, Threat Intelligence, and 8 additional
frontend dashboards. None of these were stubbed out or faked — doing so
would recreate the exact "fake detection" problem already fixed once in
this project (a UI/endpoint that *looks* functional but returns synthetic
data). These require real integrations (TheHive's REST API, a chosen SOAR
tool's webhook, a threat-intel feed) that don't exist anywhere in this
codebase yet. The prioritized roadmap for building these for real,
one verified layer at a time, is in the review document from this
conversation — Phase 3 onward.
