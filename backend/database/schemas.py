from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    username: str
    password: str

class AttackBase(BaseModel):
    technique_id: str
    attack_name: str
    target_machine: str
    status: str

class AttackResponse(AttackBase):
    id: int
    execution_time: datetime

    class Config:
        from_attributes = True


class DetectionBase(BaseModel):
    attack_id: int
    source: str
    rule_id: str
    detected: bool
    latency_seconds: int

class DetectionResponse(DetectionBase):
    id: int
    detection_time: datetime

    class Config:
        from_attributes = True


class TechniqueBase(BaseModel):
    technique_id: str
    technique_name: str
    tactic: str

class TechniqueResponse(TechniqueBase):
    class Config:
        from_attributes = True