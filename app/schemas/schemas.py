from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field

from app.models.models import StarCategory, SubmissionStatus, UserRole

# --- CHAPTER SCHEMAS ---
class ChapterBase(BaseModel):
    name: str

class ChapterCreate(ChapterBase):
    pass

class ChapterResponse(ChapterBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True  # Untuk kompatibilitas SQLAlchemy (ORM mode)
        
# ==========================================
# 1. AUTH & USER SCHEMAS
# ==========================================

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    chapter_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.CHAPTER_USER
    chapter_name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    chapter_name: Optional[str] = None

    model_config = {"from_attributes": True}


# ==========================================
# 2. STANDARD SCHEMAS (5-STAR PROGRAM)
# ==========================================

class StandardBase(BaseModel):
    id: str
    star: StarCategory
    name: str
    purpose: str
    requirement: str
    evidence_guide: str
    max_score: int = 100
    active_status: str = "Active"


class StandardCreate(StandardBase):
    pass


class StandardUpdate(BaseModel):
    name: Optional[str] = None
    purpose: Optional[str] = None
    requirement: Optional[str] = None
    evidence_guide: Optional[str] = None
    max_score: Optional[int] = None
    active_status: Optional[str] = None


class StandardResponse(StandardBase):
    model_config = {"from_attributes": True}


# ==========================================
# 3. SUBMISSION SCHEMAS
# ==========================================

class SubmissionCreate(BaseModel):
    standard_id: str
    title: str
    description: str
    evidence_url: Optional[str] = None


class SubmissionReview(BaseModel):
    status: SubmissionStatus
    score_earned: int
    evaluator_notes: Optional[str] = None


class SubmissionResponse(BaseModel):
    id: int
    chapter_name: str
    standard_id: str
    title: str
    description: str
    evidence_url: Optional[str] = None
    file_path: Optional[str] = None
    status: SubmissionStatus
    score_earned: int
    evaluator_notes: Optional[str] = None
    submitted_at: datetime

    model_config = {"from_attributes": True}


# ==========================================
# 4. LEADERBOARD SCHEMAS
# ==========================================

class StarBreakdown(BaseModel):
    Efficiency: int = 0
    Network: int = 0
    Experience: int = 0
    Outreach: int = 0
    Impact: int = 0


class LeaderboardEntry(BaseModel):
    rank: int
    chapter_name: str
    qualified_stars: int
    efficiency_band: str
    total_score: int
    breakdown: StarBreakdown


# ==========================================
# 5. KPI SELF-ASSESSMENT SCHEMAS
# ==========================================

class KPISubmissionCreate(BaseModel):
    chapter_name: str
    year: int = 2026
    membership_data: Optional[Dict[str, Any]] = None
    legality_data: Optional[Dict[str, Any]] = None
    poa_data: Optional[Dict[str, Any]] = None
    impact_data: Optional[Dict[str, Any]] = None
    skill_data: Optional[Dict[str, Any]] = None
    national_events_data: Optional[Dict[str, Any]] = None
    intl_events_data: Optional[Dict[str, Any]] = None
    branding_data: Optional[Dict[str, Any]] = None
    awarding_data: Optional[Dict[str, Any]] = None
    misc_data: Optional[Dict[str, Any]] = None


class KPISubmissionReview(BaseModel):
    evaluator_score: int
    evaluator_feedback: Optional[str] = None
    status: str = "Evaluated"


class KPISubmissionResponse(KPISubmissionCreate):
    id: int
    evaluator_score: int
    evaluator_feedback: Optional[str] = None
    status: str
    submitted_at: datetime
    evaluated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class KPILeaderboardEntry(BaseModel):
    rank: int
    chapter_name: str
    kpi_score: int
    status: str
    submitted_at: Optional[datetime] = None