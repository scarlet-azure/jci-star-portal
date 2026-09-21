from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import KPISubmission, User, UserRole
from app.schemas.schemas import KPISubmissionCreate, KPISubmissionResponse, KPISubmissionReview

router = APIRouter(prefix="/kpi", tags=["KPI Self-Assessment"])

# 1. GET CHAPTER'S KPI SUBMISSION
@router.get("/{chapter_name}", response_model=Optional[KPISubmissionResponse])
def get_chapter_kpi(chapter_name: str, db: Session = Depends(get_db)):
    clean_name = chapter_name.replace("JCI ", "").strip()
    sub = db.query(KPISubmission).filter(
        KPISubmission.chapter_name.ilike(f"%{clean_name}%")
    ).first()
    return sub

# 2. SUBMIT / UPDATE KPI FORM (FOR CHAPTERS)
@router.post("/submit", response_model=KPISubmissionResponse)
def submit_kpi(payload: KPISubmissionCreate, db: Session = Depends(get_db)):
    clean_name = payload.chapter_name.replace("JCI ", "").strip()
    
    existing = db.query(KPISubmission).filter(
        KPISubmission.chapter_name.ilike(f"%{clean_name}%"),
        KPISubmission.year == payload.year
    ).first()

    if existing:
        existing.membership_data = payload.membership_data
        existing.legality_data = payload.legality_data
        existing.poa_data = payload.poa_data
        existing.impact_data = payload.impact_data
        existing.skill_data = payload.skill_data
        existing.national_events_data = payload.national_events_data
        existing.intl_events_data = payload.intl_events_data
        existing.branding_data = payload.branding_data
        existing.awarding_data = payload.awarding_data
        existing.misc_data = payload.misc_data
        existing.status = payload.status or "Draft"  # Menyimpan "Draft" atau "Submitted"
        existing.submitted_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_sub = KPISubmission(
            chapter_name=payload.chapter_name,
            year=payload.year,
            membership_data=payload.membership_data,
            legality_data=payload.legality_data,
            poa_data=payload.poa_data,
            impact_data=payload.impact_data,
            skill_data=payload.skill_data,
            national_events_data=payload.national_events_data,
            intl_events_data=payload.intl_events_data,
            branding_data=payload.branding_data,
            awarding_data=payload.awarding_data,
            misc_data=payload.misc_data,
            status=payload.status or "Draft"
        )
        db.add(new_sub)
        db.commit()
        db.refresh(new_sub)
        return new_sub

# 3. GET ALL KPI SUBMISSIONS (FOR EVALUATOR)
@router.get("/admin/submissions", response_model=List[KPISubmissionResponse])
def get_all_kpi_submissions(db: Session = Depends(get_db)):
    return db.query(KPISubmission).order_by(KPISubmission.submitted_at.desc()).all()

# 4. REVIEW & GRADE KPI SUBMISSION (FOR EVALUATOR)
@router.put("/admin/{sub_id}/review", response_model=KPISubmissionResponse)
def review_kpi_submission(sub_id: int, review: KPISubmissionReview, db: Session = Depends(get_db)):
    sub = db.query(KPISubmission).filter(KPISubmission.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="KPI Submission tidak ditemukan.")
    
    sub.evaluator_score = review.evaluator_score
    sub.evaluator_feedback = review.evaluator_feedback
    sub.status = review.status
    sub.evaluated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(sub)
    return sub