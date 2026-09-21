from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db

from app.models.models import Chapter, User, Submission, UserRole, SubmissionStatus
from app.schemas.schemas import ChapterCreate, ChapterResponse
from app.utils import calculate_chapter_scores

router = APIRouter()

@router.get("/", response_model=List[ChapterResponse])
def get_chapters(db: Session = Depends(get_db)):
    try:
        chapters = db.query(Chapter).all()
        result = []
        
        for c in chapters:
            clean_name = c.name.replace("JCI ", "").strip()
            
            # Cari PIC Email
            pic = db.query(User).filter(
                User.role.in_([UserRole.CHAPTER_PIC, UserRole.CHAPTER_USER]),
                User.chapter_name.ilike(f"%{clean_name}%")
            ).first()
            
            # Hitung Skor via Utils
            try:
                scores_data = calculate_chapter_scores(db, c.name)
                total_score = scores_data.get("total_score", 0)
            except Exception as score_err:
                print(f"Error calculating score for {c.name}: {score_err}")
                total_score = 0
            
            # Hitung Pending Reviews
            pending_count = db.query(Submission).filter(
                Submission.chapter_name.ilike(f"%{clean_name}%"),
                Submission.status.in_([SubmissionStatus.PENDING, "Pending", "Submitted", "Pending Review"])
            ).count()

            # Menggunakan getattr agar tidak crash jika nvp_name belum ada di DB
            nvp_val = getattr(c, "nvp_name", None) or "Unassigned"

            result.append({
                "id": c.id,
                "name": c.name,
                "nvp_name": nvp_val,
                "pic_email": pic.email if pic else "-",
                "total_score": total_score,
                "pending_reviews": pending_count
            })

        return result
    except Exception as e:
        print("CRITICAL ERROR in get_chapters:", e)
        raise HTTPException(status_code=500, detail=str(e))