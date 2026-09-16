import enum
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
    Enum as SQLEnum,
    ForeignKey,
    JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base


# ==========================================
# 1. ENUMS
# ==========================================
class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    CHAPTER_PIC = "CHAPTER_PIC"
    CHAPTER_USER = "CHAPTER_USER"


class StarCategory(str, enum.Enum):
    EFFICIENCY = "EFFICIENCY"
    NETWORK = "NETWORK"
    EXPERIENCE = "EXPERIENCE"
    OUTREACH = "OUTREACH"
    IMPACT = "IMPACT"


class SubmissionStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REVISION_REQUESTED = "Revision Requested"
    REJECTED = "Rejected"
    NEEDS_REVISION = "Needs Revision"


# ==========================================
# 2. USER MODEL
# ==========================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.CHAPTER_PIC, nullable=False)
    chapter_name = Column(String, nullable=True, index=True)
    is_approved = Column(Boolean, default=False)
    reset_code = Column(String, nullable=True)
    reset_code_expires = Column(DateTime, nullable=True)

    # Tambahkan foreign_keys di bawah ini
    submissions = relationship(
        "Submission", 
        back_populates="user",
        foreign_keys="Submission.submitted_by_id"
    )


# ==========================================
# 3. CHAPTER MODEL
# ==========================================
class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)


# ==========================================
# 4. STANDARD MODEL (5-STAR PROGRAM)
# ==========================================
class Standard(Base):
    __tablename__ = "standards"

    id = Column(String, primary_key=True, index=True)  # Format e.g., "EFF-01"
    name = Column(String, nullable=False)
    star = Column(SQLEnum(StarCategory), nullable=False, index=True)
    purpose = Column(Text, nullable=True)
    requirement = Column(Text, nullable=True)
    evidence_guide = Column(Text, nullable=True)
    max_score = Column(Integer, nullable=False, default=10)
    deadline = Column(String, nullable=True)
    active_status = Column(String, nullable=False, default="Active")

    submissions = relationship("Submission", back_populates="standard")


# ==========================================
# 5. SUBMISSION MODEL (5-STAR PROGRAM)
# ==========================================
class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    standard_id = Column(String, ForeignKey("standards.id"), nullable=False, index=True)
    chapter_name = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    url = Column(String, nullable=True)
    file = Column(String, nullable=True)
    
    status = Column(
        SQLEnum(SubmissionStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=SubmissionStatus.PENDING,
        nullable=False
    )
    score_earned = Column(Integer, default=0, nullable=False)
    evaluator_notes = Column(Text, nullable=True)
    
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    evaluated_at = Column(DateTime, nullable=True)

    standard = relationship("Standard", back_populates="submissions")
    # Tambahkan foreign_keys di bawah ini
    user = relationship(
        "User", 
        back_populates="submissions",
        foreign_keys=[submitted_by_id]
    )

# ==========================================
# 6. ANNUAL ARCHIVE MODEL
# ==========================================
class AnnualArchive(Base):
    __tablename__ = "annual_archives"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, index=True, nullable=False)
    chapter_name = Column(String, index=True, nullable=False)
    total_score = Column(Integer, nullable=False)
    qualified_stars = Column(Integer, nullable=False)
    efficiency_band = Column(String, nullable=False)
    breakdown_json = Column(JSON, nullable=True)


# ==========================================
# 7. KPI SELF-ASSESSMENT MODEL
# ==========================================
class KPISubmission(Base):
    __tablename__ = "kpi_submissions"

    id = Column(Integer, primary_key=True, index=True)
    chapter_name = Column(String, nullable=False, index=True)
    year = Column(Integer, default=2026, nullable=False)
    
    membership_data = Column(JSON, nullable=True)
    legality_data = Column(JSON, nullable=True)
    poa_data = Column(JSON, nullable=True)
    impact_data = Column(JSON, nullable=True)
    skill_data = Column(JSON, nullable=True)
    national_events_data = Column(JSON, nullable=True)
    intl_events_data = Column(JSON, nullable=True)
    branding_data = Column(JSON, nullable=True)
    awarding_data = Column(JSON, nullable=True)
    misc_data = Column(JSON, nullable=True)

    evaluator_score = Column(Integer, default=0, nullable=False)
    evaluator_feedback = Column(Text, nullable=True)
    status = Column(String, default="Pending Evaluation", nullable=False)
    
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    evaluated_at = Column(DateTime, nullable=True)