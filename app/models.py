from datetime import datetime, timezone
import enum
from app.database import Base
from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship


class StarCategory(str, enum.Enum):
    EFFICIENCY = "Efficiency"
    NETWORK = "Network"
    EXPERIENCE = "Experience"
    OUTREACH = "Outreach"
    IMPACT = "Impact"


class SubmissionStatus(str, enum.Enum):
    NOT_SUBMITTED = "Not Submitted"
    PENDING = "Pending Verification"
    APPROVED = "Approved"
    REJECTED = "Rejected"


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    CHAPTER_PIC = "CHAPTER_PIC"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.CHAPTER_PIC)
    chapter_name = Column(String, nullable=True)
    is_approved = Column(Boolean, default=False)  # Approval oleh Admin
    reset_code = Column(String, nullable=True)  # Kode Otp Forgot Password
    reset_code_expires = Column(DateTime, nullable=True)


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    submissions = relationship("Submission", back_populates="chapter")


class Standard(Base):
    __tablename__ = "standards"

    id = Column(String, primary_key=True, index=True)
    star = Column(Enum(StarCategory))
    name = Column(String)
    purpose = Column(String)
    requirement = Column(String)
    evidence_guide = Column(String)
    max_score = Column(Integer)
    active_status = Column(String)
    deadline = Column(String, nullable=True)
    submissions = relationship("Submission", back_populates="standard", cascade="all, delete-orphan")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    standard_id = Column(String, ForeignKey("standards.id"))
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True)
    chapter_name = Column(String, nullable=True)
    title = Column(String)
    description = Column(Text)
    url = Column(String, nullable=True)
    file = Column(String, nullable=True)
    status = Column(String, default=SubmissionStatus.PENDING)
    score_earned = Column(Integer, default=0)
    evaluator_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    evaluated_at = Column(DateTime(timezone=True), nullable=True)

    standard = relationship("Standard", back_populates="submissions")
    chapter = relationship("Chapter", back_populates="submissions")


# Model Arsip Tahunan (Annual Archive)
class AnnualArchive(Base):
    __tablename__ = "annual_archives"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, index=True)
    chapter_name = Column(String, index=True)
    total_score = Column(Integer)
    qualified_stars = Column(Integer)
    efficiency_band = Column(String)
    breakdown_json = Column(JSON)  # Detail skor per bintang
    archived_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# Model KPI Submission
class KPISubmission(Base):
    __tablename__ = "kpi_submissions"

    id = Column(Integer, primary_key=True, index=True)
    chapter_name = Column(String, index=True)
    year = Column(Integer, default=2026)
    
    # Isian 10 Kategori Aspek Form KPI (JSON Structured Data)
    membership_data = Column(JSON, nullable=True)  # Aspek 1
    legality_data = Column(JSON, nullable=True)     # Aspek 2
    poa_data = Column(JSON, nullable=True)         # Aspek 3
    impact_data = Column(JSON, nullable=True)      # Aspek 4
    skill_data = Column(JSON, nullable=True)       # Aspek 5
    national_events_data = Column(JSON, nullable=True) # Aspek 6
    intl_events_data = Column(JSON, nullable=True)     # Aspek 7
    branding_data = Column(JSON, nullable=True)    # Aspek 8
    awarding_data = Column(JSON, nullable=True)    # Aspek 9
    misc_data = Column(JSON, nullable=True)        # Aspek 10
    
    # Poin Skor & Feedback dari National Evaluator
    evaluator_score = Column(Integer, default=0)
    evaluator_feedback = Column(Text, nullable=True)
    status = Column(String, default="Draft")  # Draft, Pending Verification, Evaluated
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    evaluated_at = Column(DateTime(timezone=True), nullable=True)