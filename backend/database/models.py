from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database.db import Base


class Attack(Base):
    __tablename__ = "attacks"

    id = Column(Integer, primary_key=True)
    technique_id = Column(String(20), ForeignKey("techniques.technique_id"), index=True)
    attack_name = Column(String(100))
    target_machine = Column(String(100))
    execution_time = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    status = Column(String(50))

    technique = relationship("Technique", back_populates="attacks")
    detections = relationship(
        "Detection", back_populates="attack", cascade="all, delete-orphan"
    )


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True)
    attack_id = Column(Integer, ForeignKey("attacks.id", ondelete="CASCADE"), index=True)
    wazuh_alert_id = Column(Integer, ForeignKey("wazuh_alerts.id"), nullable=True)
    source = Column(String(50))
    rule_id = Column(String(50))
    detected = Column(Boolean, default=False, index=True)
    latency_seconds = Column(Integer, nullable=True)
    detection_time = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    attack = relationship("Attack", back_populates="detections")
    wazuh_alert = relationship("WazuhAlert", back_populates="detections")


class Technique(Base):
    __tablename__ = "techniques"

    technique_id = Column(String(20), primary_key=True)
    technique_name = Column(String(100))
    tactic = Column(String(100), index=True)

    attacks = relationship("Attack", back_populates="technique")


class WazuhAlert(Base):
    __tablename__ = "wazuh_alerts"

    id = Column(Integer, primary_key=True)
    alert_id = Column(String(100), unique=True, index=True)
    rule_id = Column(String(50), index=True)
    rule_description = Column(Text)
    level = Column(Integer)
    agent_name = Column(String(100))
    technique_id = Column(String(20), nullable=True)
    timestamp = Column(DateTime(timezone=True), index=True)
    full_log = Column(Text)

    detections = relationship("Detection", back_populates="wazuh_alert")


class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(Integer, primary_key=True)
    technique_id = Column(String(20), ForeignKey("techniques.technique_id"), index=True)
    technique_name = Column(String(100))
    tactic = Column(String(100))
    status = Column(String(50))
    confidence = Column(Integer)
    detected = Column(Boolean)
    execution_log = Column(Text)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    # No server_default here -- previously this defaulted to func.now() at
    # INSERT time, identical to started_at, so it never actually reflected
    # when the simulation finished. Set explicitly in code on completion.
    completed_at = Column(DateTime(timezone=True), nullable=True)


class AtomicExecution(Base):
    """
    One row per Atomic Red Team test step actually executed (an Attack row
    can correspond to multiple AtomicExecution rows if a technique has
    several atomic tests run in one go). Stores the real artifacts from
    Invoke-AtomicTest -- not a synthetic summary -- so the platform can
    show exactly which command ran, its real exit code, and raw output.
    """
    __tablename__ = "atomic_executions"

    id = Column(Integer, primary_key=True)
    attack_id = Column(Integer, ForeignKey("attacks.id", ondelete="CASCADE"), index=True)
    atomic_test_number = Column(Integer, nullable=True)
    atomic_test_name = Column(String(255), nullable=True)
    command_executed = Column(Text, nullable=True)
    exit_code = Column(Integer, nullable=True)
    raw_output = Column(Text, nullable=True)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())

    attack = relationship("Attack", backref="atomic_executions")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="Viewer", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100))
    action = Column(String(255))
    # Standardized to a DB-side default so the column populates correctly
    # whether the row is inserted via the ORM or via raw parameterized SQL
    # (services/audit.py uses raw SQL). The previous Python-side
    # `default=datetime.utcnow` only fired on ORM inserts, leaving every
    # audit_logs.timestamp NULL when written through log_action().
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)


# Composite index used by the detection-gap and correlation queries, which
# always filter Attack by technique_id and order/filter by execution_time.
Index("ix_attacks_technique_time", Attack.technique_id, Attack.execution_time)
