from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db

from app.models.models import Chapter, User, Submission, UserRole, SubmissionStatus
from app.schemas.schemas import ChapterCreate, ChapterResponse
from app.utils import calculate_chapter_scores

router = APIRouter()

@router.get("", response_model=List[ChapterResponse])
@router.get("/", response_model=List[ChapterResponse])
def get_chapters(db: Session = Depends(get_db)):
    try:
        chapters = db.query(Chapter).all()
        result = []
        
        for c in chapters:
            if not c or not getattr(c, "name", None):
                continue

            clean_name = c.name.replace("JCI ", "").strip()
            
            # 1. Cari PIC Email secara aman
            pic_email_val = getattr(c, "pic_email", None)
            if not pic_email_val:
                try:
                    pic = db.query(User).filter(
                        User.role.in_([UserRole.CHAPTER_PIC, UserRole.CHAPTER_USER]),
                        User.chapter_name.ilike(f"%{clean_name}%")
                    ).first()
                    pic_email_val = pic.email if pic else "-"
                except Exception as pic_err:
                    print(f"Warning: Failed to fetch PIC email for {c.name}: {pic_err}")
                    pic_email_val = "-"
            
            # 2. Hitung Skor via Utils dengan safety fallback
            total_score = 0
            try:
                scores_data = calculate_chapter_scores(db, c.name)
                if isinstance(scores_data, dict):
                    total_score = scores_data.get("total_score", 0)
            except Exception as score_err:
                print(f"Warning: Score calculation skipped for {c.name}: {score_err}")
            
            # 3. Hitung Pending Reviews secara aman
            pending_count = 0
            try:
                pending_count = db.query(Submission).filter(
                    Submission.chapter_name.ilike(f"%{clean_name}%"),
                    Submission.status.in_([
                        SubmissionStatus.PENDING, 
                        SubmissionStatus.NEEDS_REVISION,
                        "Pending", 
                        "Submitted", 
                        "Pending Review"
                    ])
                ).count()
            except Exception as sub_err:
                print(f"Warning: Pending count failed for {c.name}: {sub_err}")

            # 4. Ambil NVP Name tanpa crash meskipun kolom DB belum ada
            nvp_val = getattr(c, "nvp_name", None) or "Unassigned"

            result.append({
                "id": c.id,
                "name": c.name,
                "nvp_name": nvp_val,
                "pic_email": pic_email_val or "-",
                "total_score": total_score,
                "pending_reviews": pending_count
            })

        return result
    except Exception as e:
        print("CRITICAL ERROR in get_chapters:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terjadi kesalahan pada server: {str(e)}"
        )


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_chapter(payload: dict, db: Session = Depends(get_db)):
    chap_name = payload.get("name") or payload.get("chapter_name")
    nvp_name = payload.get("nvp_name", "Unassigned")
    pic_email = payload.get("pic_email", "")

    if not chap_name:
        raise HTTPException(status_code=400, detail="Nama Chapter wajib diisi.")

    existing = db.query(Chapter).filter(Chapter.name.ilike(chap_name.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Chapter '{chap_name}' sudah terdaftar.")

    # Inisialisasi model hanya dengan kolom yang didukung
    chapter_kwargs = {"name": chap_name.strip()}
    if hasattr(Chapter, "nvp_name"):
        chapter_kwargs["nvp_name"] = nvp_name.strip() if nvp_name else "Unassigned"
    if hasattr(Chapter, "pic_email"):
        chapter_kwargs["pic_email"] = pic_email.strip() if pic_email else ""

    new_chapter = Chapter(**chapter_kwargs)
    db.add(new_chapter)
    db.commit()
    db.refresh(new_chapter)

    return {
        "message": f"Chapter '{new_chapter.name}' berhasil ditambahkan!", 
        "chapter": {"id": new_chapter.id, "name": new_chapter.name}
    }


@router.put("/{old_name}")
def update_chapter(old_name: str, payload: dict, db: Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.name.ilike(old_name.strip())).first()
    if not chapter:
        raise HTTPException(status_code=404, detail=f"Chapter '{old_name}' tidak ditemukan.")

    new_name = payload.get("name") or payload.get("chapter_name")
    if new_name:
        chapter.name = new_name.strip()
    
    if "nvp_name" in payload and hasattr(chapter, "nvp_name"):
        chapter.nvp_name = payload["nvp_name"].strip() if payload["nvp_name"] else "Unassigned"
        
    if "pic_email" in payload and hasattr(chapter, "pic_email"):
        chapter.pic_email = payload["pic_email"].strip()

    db.commit()
    db.refresh(chapter)
    return {"message": f"Chapter '{chapter.name}' berhasil diperbarui!"}


@router.delete("/{chap_name}")
def delete_chapter(chap_name: str, db: Session = Depends(get_db)):
    chapter = db.query(Chapter).filter(Chapter.name.ilike(chap_name.strip())).first()
    if not chapter:
        raise HTTPException(status_code=404, detail=f"Chapter '{chap_name}' tidak ditemukan.")

    db.delete(chapter)
    db.commit()
    return {"message": f"Chapter '{chap_name}' berhasil dihapus!"}