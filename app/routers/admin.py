from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import User, UserRole, Submission, Standard, AnnualArchive, Chapter
from app.schemas.schemas import (
    UserResponse,
    StandardCreate,
    StandardUpdate,
    StandardResponse,
    SubmissionReview,
    SubmissionResponse,
)
from app.utils import calculate_chapter_scores

router = APIRouter()

# ==========================================
# 1. USER MANAGEMENT (APPROVE / REJECT)
# ==========================================

@router.get("/pending-users", response_model=List[UserResponse])
def get_pending_users(db: Session = Depends(get_db)):
    """Mendapatkan daftar user PIC Chapter yang belum disetujui."""
    return db.query(User).filter(
        User.role == UserRole.CHAPTER_USER, 
        User.chapter_name.isnot(None)
    ).all()


@router.put("/approve-user/{user_id}")
def approve_user(user_id: int, action: str, db: Session = Depends(get_db)):
    """Setujui (approve) atau tolak (reject) pendaftaran user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    if action.lower() == "approve":
        # Jika ada field status/is_approved di model User, update di sini
        db.commit()
        return {"message": f"User {user.full_name} berhasil disetujui."}
    elif action.lower() == "reject":
        db.delete(user)
        db.commit()
        return {"message": f"Pendaftaran {user.full_name} ditolak dan akun dihapus."}
    else:
        raise HTTPException(status_code=400, detail="Action tidak valid. Gunakan 'approve' atau 'reject'.")


# ==========================================
# 2. SUBMISSION AUDIT & VERIFICATION
# ==========================================

@router.put("/verify/{submission_id}", response_model=SubmissionResponse)
def verify_submission(
    submission_id: int,
    payload: SubmissionReview,
    db: Session = Depends(get_db)
):
    """Verifikasi, berikan nilai, dan catatan evaluasi untuk submission."""
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission tidak ditemukan.")

    sub.status = payload.status
    sub.score_earned = payload.score_earned
    sub.evaluator_notes = payload.evaluator_notes
    
    db.commit()
    db.refresh(sub)
    return sub


# ==========================================
# 3. STANDARDS MANAGEMENT (CRUD)
# ==========================================

@router.post("/standards", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
def create_standard(std: StandardCreate, db: Session = Depends(get_db)):
    """Menambahkan kriteria Standard baru."""
    existing = db.query(Standard).filter(Standard.id == std.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Standard ID sudah terdaftar.")

    new_std = Standard(**std.model_dump())
    db.add(new_std)
    db.commit()
    db.refresh(new_std)
    return new_std


@router.put("/standards/{std_id}", response_model=StandardResponse)
def update_standard(std_id: str, std: StandardUpdate, db: Session = Depends(get_db)):
    """Memperbarui kriteria Standard yang ada."""
    existing = db.query(Standard).filter(Standard.id == std_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Standard tidak ditemukan.")

    update_data = std.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)

    db.commit()
    db.refresh(existing)
    return existing


@router.delete("/standards/{std_id}")
def delete_standard(std_id: str, db: Session = Depends(get_db)):
    """Hapus Standard beserta seluruh submission terkait."""
    std = db.query(Standard).filter(Standard.id == std_id).first()
    if not std:
        raise HTTPException(status_code=404, detail="Standard tidak ditemukan.")

    db.query(Submission).filter(Submission.standard_id == std_id).delete()
    db.delete(std)
    db.commit()
    return {"message": f"Standard {std_id} dan seluruh submission terkait berhasil dihapus."}

@router.get("/archives/{chapter_name}")
def get_chapter_archives(chapter_name: str, db: Session = Depends(get_db)):
    clean_chap = chapter_name.replace("JCI ", "").strip()
    archives = db.query(AnnualArchive).filter(
        AnnualArchive.chapter_name.ilike(f"%{clean_chap}%")
    ).order_by(AnnualArchive.year.desc()).all()
    
    return archives or []

# ==========================================
# 4. ANNUAL ARCHIVE & RESET
# ==========================================

@router.post("/archive-year/{year}")
def archive_annual_cycle(year: int, db: Session = Depends(get_db)):
    """Arsip skor tahunan seluruh chapter dan reset submission untuk siklus baru."""
    chapters = db.query(Chapter).all()
    if not chapters:
        # Fallback ambil dari chapter_name di User jika tabel Chapter belum terisi
        chapter_names = db.query(User.chapter_name).distinct().all()
        chapter_list = [c[0] for c in chapter_names if c[0]]
    else:
        chapter_list = [c.name for c in chapters]

    for chap_name in chapter_list:
        scores = calculate_chapter_scores(db, chap_name)
        archive = AnnualArchive(
            year=year,
            chapter_name=chap_name,
            total_score=scores["total_score"],
            qualified_stars=scores["qualified_stars"],
            efficiency_band=scores["efficiency_band"],
            breakdown_json=scores["breakdown"]
        )
        db.add(archive)

    # Reset seluruh data submission untuk siklus berikutnya
    db.query(Submission).delete()
    db.commit()
    return {"message": f"Siklus tahun {year} berhasil diarsipkan dan data submission di-reset!"}