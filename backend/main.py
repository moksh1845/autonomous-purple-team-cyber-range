from datetime import datetime, timezone

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from config.settings import settings

from services.executive_dashboard import get_executive_dashboard
from api.detection_metrics import router as metrics_router
from attack_mappings.mitre_mapper import MITRE_ATTACKS
from correlation.correlation_engine import correlate_attack
from database import models
from routes.audit_logs import router as audit_router
from services.audit import log_action
from security.rbac import require_role
from database.db import engine, get_db
from database.models import Attack, Detection, Technique, User, Simulation
from database.schemas import (
    AttackBase,
    DetectionBase,
    TechniqueBase,
    RegisterRequest,
    LoginRequest,
)
from integrations.wazuh_client import get_agents, get_alerts
from routes.attack_timeline import router as attack_timeline_router
from routes.detection_gap import router as detection_gap_router
from routes.detection_trends import router as detection_trends_router
from routes.executive_dashboard import router as executive_router
from routes.latency_metrics import router as latency_router
from routes.mitre_coverage import router as mitre_coverage_router
from routes.mitre_heatmap import router as mitre_heatmap_router
from routes.purple_score import router as score_router
from routes.security_posture import router as security_posture_router
from routes.wazuh_live import router as wazuh_live_router
from services.alert_collector import collect_alerts
from services.correlate_attack import correlate_attack as db_correlate_attack
from services.agent_health import get_agent_health
from services.health_service import get_health
from routes.simulations import router as simulations_router
from security.auth import get_current_user
from security.password import hash_password, verify_password
from security.jwt_handler import create_access_token

app = FastAPI(title="Autonomous Purple Team Cyber Range", version="1.0")

# =========================
# Router registration (each router included exactly once)
# =========================
app.include_router(mitre_heatmap_router)
app.include_router(detection_trends_router)
app.include_router(attack_timeline_router)
app.include_router(metrics_router)
app.include_router(detection_gap_router)
app.include_router(simulations_router)
app.include_router(latency_router)
app.include_router(mitre_coverage_router)
app.include_router(audit_router)
app.include_router(security_posture_router)
app.include_router(wazuh_live_router)
app.include_router(executive_router)
app.include_router(score_router)

models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Purple Team Cyber Range Backend Running"}


# ==========================
# ATTACK APIs
# ==========================


@app.post("/attacks")
def create_attack(
    attack: AttackBase,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin", "Purple Team Lead"])),
):
    new_attack = Attack(
        technique_id=attack.technique_id,
        attack_name=attack.attack_name,
        target_machine=attack.target_machine,
        status=attack.status,
    )

    db.add(new_attack)
    db.commit()
    db.refresh(new_attack)

    log_action(current_user["sub"], f"Created attack {new_attack.technique_id}")

    return {"message": "Attack Added Successfully", "attack": new_attack}


@app.get("/attacks")
def get_attacks(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    limit: int = 100,
    offset: int = 0,
):
    return db.query(Attack).order_by(Attack.id.desc()).offset(offset).limit(limit).all()


# ==========================
# DETECTION APIs
# ==========================


@app.post("/detections")
def create_detection(
    detection: DetectionBase,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin", "Purple Team Lead"])),
):
    new_detection = Detection(
        attack_id=detection.attack_id,
        source=detection.source,
        rule_id=detection.rule_id,
        detected=detection.detected,
        latency_seconds=detection.latency_seconds,
    )

    db.add(new_detection)
    db.commit()
    db.refresh(new_detection)

    log_action(current_user["sub"], f"Created detection for attack {detection.attack_id}")

    return {"message": "Detection Added Successfully", "detection": new_detection.id}


@app.get("/detections")
def get_detections(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    limit: int = 100,
    offset: int = 0,
):
    return db.query(Detection).order_by(Detection.id.desc()).offset(offset).limit(limit).all()


# ==========================
# TECHNIQUE APIs
# ==========================


@app.post("/techniques")
def create_technique(
    technique: TechniqueBase,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin"])),
):
    new_technique = Technique(
        technique_id=technique.technique_id,
        technique_name=technique.technique_name,
        tactic=technique.tactic,
    )

    db.add(new_technique)
    db.commit()
    db.refresh(new_technique)

    log_action(current_user["sub"], f"Created technique {new_technique.technique_id}")

    return {
        "message": "Technique Added Successfully",
        "technique": {
            "technique_id": new_technique.technique_id,
            "technique_name": new_technique.technique_name,
            "tactic": new_technique.tactic,
        },
    }


@app.get("/techniques")
def get_techniques(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Technique).all()


@app.get("/mitre/{technique_id}")
def get_mitre_details(technique_id: str, current_user=Depends(get_current_user)):
    technique = MITRE_ATTACKS.get(technique_id)

    if technique is None:
        raise HTTPException(status_code=404, detail="Technique Not Found")

    return {
        "technique_id": technique_id,
        "technique_name": technique["name"],
        "tactic": technique["tactic"],
    }


@app.post("/execute/{technique_id}")
def execute_attack_and_detect(
    technique_id: str,
    current_user=Depends(require_role(["Admin", "Purple Team Lead"])),
):
    # Real Atomic Red Team execution + detection validation, via the one
    # shared service also used by POST /simulate -- previously this and
    # routes/simulations.py duplicated near-identical logic independently,
    # which let them silently drift apart (see IMPLEMENTATION_REPORT.md).
    from services.execution_service import execute_technique

    result = execute_technique(technique_id, executed_by=current_user["sub"])

    log_action(current_user["sub"], f"Executed {technique_id}")

    return result


@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    total_attacks = db.query(Attack).count()

    total_detections = (
        db.query(distinct(Detection.attack_id))
        .filter(Detection.detected == True)
        .count()
    )

    if total_attacks > 0:
        detection_rate = round((total_detections / total_attacks) * 100, 2)
    else:
        detection_rate = 0

    top_techniques = (
        db.query(Attack.technique_id, func.count(Attack.technique_id).label("count"))
        .group_by(Attack.technique_id)
        .order_by(func.count(Attack.technique_id).desc())
        .limit(5)
        .all()
    )

    techniques = []
    for technique in top_techniques:
        techniques.append(
            {"technique_id": technique.technique_id, "executions": technique.count}
        )

    return {
        "total_attacks": total_attacks,
        "total_detections": total_detections,
        "detection_rate": detection_rate,
        "top_techniques": techniques,
    }


@app.get("/attack-history")
def get_attack_history(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    limit: int = 20,
):
    return db.query(Attack).order_by(Attack.execution_time.desc()).limit(limit).all()


@app.get("/detection-history")
def get_detection_history(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    limit: int = 20,
):
    return (
        db.query(Detection).order_by(Detection.detection_time.desc()).limit(limit).all()
    )


@app.get("/dashboard/full")
def get_full_dashboard(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    total_attacks = db.query(Attack).count()
    total_detections = db.query(Detection).count()

    if total_attacks > 0:
        detection_rate = round((total_detections / total_attacks) * 100, 2)
    else:
        detection_rate = 0

    top_techniques = (
        db.query(Attack.technique_id, func.count(Attack.technique_id).label("count"))
        .group_by(Attack.technique_id)
        .order_by(func.count(Attack.technique_id).desc())
        .limit(5)
        .all()
    )

    techniques = [
        {"technique_id": t.technique_id, "executions": t.count} for t in top_techniques
    ]

    recent_attacks = (
        db.query(Attack).order_by(Attack.execution_time.desc()).limit(10).all()
    )
    attack_list = [
        {
            "id": a.id,
            "technique_id": a.technique_id,
            "status": a.status,
            "execution_time": a.execution_time,
        }
        for a in recent_attacks
    ]

    recent_detections = (
        db.query(Detection).order_by(Detection.detection_time.desc()).limit(10).all()
    )
    detection_list = [
        {
            "id": d.id,
            "attack_id": d.attack_id,
            "source": d.source,
            "rule_id": d.rule_id,
            "detected": d.detected,
            "latency_seconds": d.latency_seconds,
        }
        for d in recent_detections
    ]

    return {
        "metrics": {
            "total_attacks": total_attacks,
            "total_detections": total_detections,
            "detection_rate": detection_rate,
        },
        "top_techniques": techniques,
        "recent_attacks": attack_list,
        "recent_detections": detection_list,
    }


@app.get("/coverage")
def get_mitre_coverage(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    total_techniques = db.query(Technique).count()
    executed_techniques = db.query(Attack.technique_id).distinct().count()

    coverage_percentage = (
        round((executed_techniques / total_techniques) * 100, 2)
        if total_techniques > 0
        else 0
    )

    return {
        "total_techniques": total_techniques,
        "executed_techniques": executed_techniques,
        "coverage_percentage": coverage_percentage,
    }


@app.get("/scorecard")
def get_scorecard(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    total_techniques = db.query(Technique).count()
    executed_techniques = db.query(Attack.technique_id).distinct().count()

    coverage_percentage = (
        round((executed_techniques / total_techniques) * 100, 2)
        if total_techniques > 0
        else 0
    )

    total_attacks = db.query(Attack).count()
    detected_attacks = db.query(distinct(Detection.attack_id)).count()

    detection_rate = (
        round((detected_attacks / total_attacks) * 100, 2) if total_attacks > 0 else 0
    )

    avg_latency = db.query(func.avg(Detection.latency_seconds)).scalar() or 0
    avg_latency = round(avg_latency, 2)

    if avg_latency <= 2:
        latency_score = 100
    elif avg_latency <= 5:
        latency_score = 80
    elif avg_latency <= 10:
        latency_score = 60
    else:
        latency_score = 40

    purple_team_score = round(
        (coverage_percentage * 0.5 + detection_rate * 0.4 + latency_score * 0.1), 2
    )

    return {
        "coverage_percentage": coverage_percentage,
        "detection_rate": detection_rate,
        "average_latency": avg_latency,
        "purple_team_score": purple_team_score,
    }


@app.get("/report")
def generate_report(
    current_user=Depends(require_role(["Admin", "Purple Team Lead"])),
    db: Session = Depends(get_db),
):
    total_attacks = db.query(Attack).count()

    detected_attacks = (
        db.query(distinct(Detection.attack_id))
        .filter(Detection.detected == True)
        .count()
    )

    total_detections = db.query(Detection).count()
    missed_attacks = total_attacks - detected_attacks

    detection_rate = (
        round((detected_attacks / total_attacks) * 100, 2) if total_attacks > 0 else 0
    )

    total_techniques = db.query(Technique).count()
    executed_techniques = db.query(Attack.technique_id).distinct().count()

    coverage_percentage = (
        round((executed_techniques / total_techniques) * 100, 2)
        if total_techniques > 0
        else 0
    )

    avg_latency = db.query(func.avg(Detection.latency_seconds)).scalar() or 0
    avg_latency = round(avg_latency, 2)

    if avg_latency <= 2:
        latency_score = 100
    elif avg_latency <= 5:
        latency_score = 80
    elif avg_latency <= 10:
        latency_score = 60
    else:
        latency_score = 40

    purple_team_score = round(
        (coverage_percentage * 0.5 + detection_rate * 0.4 + latency_score * 0.1), 2
    )

    top_techniques = (
        db.query(Attack.technique_id, func.count(Attack.technique_id).label("count"))
        .group_by(Attack.technique_id)
        .order_by(func.count(Attack.technique_id).desc())
        .limit(5)
        .all()
    )
    techniques = [
        {"technique_id": t.technique_id, "executions": t.count} for t in top_techniques
    ]

    log_action(current_user["sub"], "Generated Report")

    return {
        "report_name": "Purple Team Assessment Report",
        "generated_at": datetime.now(timezone.utc),
        "summary": {
            "total_attacks": total_attacks,
            "detected_attacks": detected_attacks,
            "missed_attacks": missed_attacks,
            "total_detections": total_detections,
            "detection_rate": detection_rate,
            "coverage_percentage": coverage_percentage,
            "average_latency": avg_latency,
            "purple_team_score": purple_team_score,
        },
        "top_techniques": techniques,
    }


@app.get("/mitre-matrix")
def get_mitre_matrix(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    techniques = db.query(Technique).all()
    matrix = []

    for technique in techniques:
        attack = (
            db.query(Attack)
            .filter(Attack.technique_id == technique.technique_id)
            .first()
        )

        detection = None
        if attack:
            detection = (
                db.query(Detection).filter(Detection.attack_id == attack.id).first()
            )

        matrix.append(
            {
                "technique_id": technique.technique_id,
                "technique_name": technique.technique_name,
                "tactic": technique.tactic,
                "tested": attack is not None,
                "detected": (detection.detected if detection else False),
            }
        )

    return matrix


@app.get("/risk-score")
def get_risk_score(current_user=Depends(get_current_user)):
    # Previously this duplicated services/risk_score.py with a DIFFERENT,
    # unused algorithm (a hand-typed 5-technique severity dict, averaged
    # per-attack) while services/risk_score.py's real coverage-inverse
    # algorithm (risk = 100 - detection_coverage) sat dead, never called.
    # Two "risk score" definitions that could disagree is exactly the kind
    # of inconsistency that erodes trust in a security metric -- now there
    # is one canonical implementation, imported here instead of duplicated.
    from services.risk_score import get_risk_score as compute_risk_score
    return compute_risk_score()


@app.get("/wazuh/agents")
def wazuh_agents(current_user=Depends(require_role(["Admin", "Purple Team Lead"]))):
    return get_agents()


@app.get("/wazuh/alerts")
def wazuh_alerts(current_user=Depends(require_role(["Admin", "Purple Team Lead"]))):
    return get_alerts()


@app.get("/correlate/{technique_id}")
def correlate(
    technique_id: str,
    current_user=Depends(require_role(["Admin", "Purple Team Lead"])),
):
    return correlate_attack(technique_id)


@app.get("/real-alerts")
def real_alerts(current_user=Depends(require_role(["Admin", "Purple Team Lead"]))):
    return collect_alerts()


@app.get("/correlate-attack/{attack_id}")
def correlate_attack_route(
    attack_id: int,
    current_user=Depends(require_role(["Admin", "Purple Team Lead"])),
):
    return db_correlate_attack(attack_id)


@app.get("/agent-health")
def agent_health(current_user=Depends(get_current_user)):
    return get_agent_health()


@app.get("/executive-dashboard")
def executive_dashboard(current_user=Depends(get_current_user)):
    return get_executive_dashboard()


@app.get("/health")
def health():
    # Intentionally unauthenticated — used by uptime/monitoring checks.
    return get_health()


@app.post("/auth/register")
def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == request.username).first()

    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        role="Viewer",
    )

    db.add(user)
    db.commit()
    log_action(user.username, "User Registration")

    return {"message": "User Registered"}


@app.post("/auth/login")
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()

    if not user or not verify_password(request.password, user.password_hash):
        # Log the failed attempt with whatever username was tried, without
        # leaking whether the username itself exists.
        log_action(request.username, "Failed Login")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.username, "role": user.role})

    # Logged on the success path only, after the token is actually issued —
    # previously this call was unreachable dead code inside the failure branch.
    log_action(user.username, "User Login")

    return {"access_token": token, "token_type": "bearer"}
