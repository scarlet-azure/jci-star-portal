import os
import shutil
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, status, Request, Body
from sqlalchemy.orm import Session

from pathlib import Path

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.models import (
    User, UserRole, Submission, Standard, AnnualArchive, 
    Chapter, HandbookReference, KPISubmission
)
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

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
UPLOAD_DIR = ROOT_DIR / "uploads" / "handbooks"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ==========================================
# 1. USER MANAGEMENT (APPROVE / REJECT)
# ==========================================

@router.get("/pending-users", response_model=List[UserResponse])
def get_pending_users(db: Session = Depends(get_db)):
    """Mendapatkan daftar user PIC Chapter yang belum disetujui."""
    return db.query(User).filter(
        User.role.in_([UserRole.CHAPTER_USER, UserRole.CHAPTER_PIC]),
        User.is_approved == False,
        User.chapter_name.isnot(None)
    ).all()


@router.put("/approve-user/{user_id}")
def approve_user(user_id: int, action: str, db: Session = Depends(get_db)):
    """Setujui (approve) atau tolak (reject) pendaftaran user PIC baru."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    if action.lower() == "approve":
        user.is_approved = True
        user.role = UserRole.CHAPTER_PIC
        # Update juga pic_email pada tabel Chapter terkait
        if user.chapter_name:
            clean_c = user.chapter_name.replace("JCI ", "").strip()
            chap = db.query(Chapter).filter(Chapter.name.ilike(f"%{clean_c}%")).first()
            if chap:
                chap.pic_email = user.email
        db.commit()
        return {"message": f"User {user.full_name} berhasil disetujui sebagai PIC {user.chapter_name}."}
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
    sub.evaluated_at = datetime.utcnow()
    
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


# ==========================================
# 4. ANNUAL ARCHIVE, ISOLATED ACCESS & ROLLOVER
# ==========================================

@router.get("/archives/{chapter_name}")
def get_chapter_archives(
    chapter_name: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Mengambil arsip tahunan chapter.
    ISOLASI AKSES:
    - Admin bisa mengakses arsip seluruh chapter.
    - PIC / Chapter User hanya bisa mengakses arsip chapternya sendiri.
    """
    target_chapter = chapter_name

    if current_user and current_user.role != UserRole.ADMIN:
        if not current_user.chapter_name:
            raise HTTPException(status_code=403, detail="Akun Anda tidak terhubung ke Chapter mana pun.")
        
        clean_user_chap = current_user.chapter_name.replace("JCI ", "").strip().lower()
        clean_req_chap = chapter_name.replace("JCI ", "").strip().lower()
        
        if clean_user_chap != clean_req_chap:
            raise HTTPException(
                status_code=403,
                detail=f"Akses ditolak: Anda hanya diizinkan melihat arsip milik {current_user.chapter_name}."
            )
        target_chapter = current_user.chapter_name

    clean_chap = target_chapter.replace("JCI ", "").strip()
    archives = db.query(AnnualArchive).filter(
        AnnualArchive.chapter_name.ilike(f"%{clean_chap}%")
    ).order_by(AnnualArchive.year.desc()).all()
    
    return archives or []


@router.post("/archive-year/{year}")
def archive_annual_cycle(
    year: int,
    payload: dict = Body(default={}),
    db: Session = Depends(get_db)
):
    """
    Memfinalisasi seluruh submission (5-Star & KPI) pada tahun berjalan,
    menyimpan snapshot lengkap beserta data PIC tahun tersebut ke AnnualArchive,
    lalu mereset submission dan menyiapkan pergantian PIC baru untuk tahun berikutnya.
    """
    chapters = db.query(Chapter).all()
    if not chapters:
        chapter_names = db.query(User.chapter_name).distinct().all()
        chapter_list = [c[0] for c in chapter_names if c[0]]
    else:
        chapter_list = [c.name for c in chapters]

    reset_pic_accounts = payload.get("reset_pic_accounts", True) if isinstance(payload, dict) else True
    new_pics_map = payload.get("new_pics", {}) if isinstance(payload, dict) else {}

    archived_count = 0

    for chap_name in chapter_list:
        clean_chap = chap_name.replace("JCI ", "").strip()
        scores = calculate_chapter_scores(db, chap_name)

        chap_obj = db.query(Chapter).filter(Chapter.name.ilike(f"%{clean_chap}%")).first()
        pic_users = db.query(User).filter(
            User.chapter_name.ilike(f"%{clean_chap}%"),
            User.role.in_([UserRole.CHAPTER_PIC, UserRole.CHAPTER_USER])
        ).all()

        pic_snapshot = {
            "nvp_name": getattr(chap_obj, "nvp_name", "Unassigned") if chap_obj else "Unassigned",
            "pic_email": getattr(chap_obj, "pic_email", "-") if chap_obj else "-",
            "pic_names": [u.full_name for u in pic_users],
            "archived_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        }

        chap_subs = db.query(Submission).filter(
            Submission.chapter_name.ilike(f"%{clean_chap}%")
        ).all()

        submissions_snapshot = [
            {
                "standard_id": s.standard_id,
                "title": s.title,
                "description": s.description,
                "url": s.url,
                "file": s.file,
                "status": s.status.value if hasattr(s.status, "value") else str(s.status),
                "score_earned": s.score_earned,
                "evaluator_notes": s.evaluator_notes,
                "submitted_at": s.submitted_at.strftime("%Y-%m-%d") if s.submitted_at else "-"
            }
            for s in chap_subs
        ]

        kpi_sub = db.query(KPISubmission).filter(
            KPISubmission.chapter_name.ilike(f"%{clean_chap}%"),
            KPISubmission.year == year
        ).first()

        kpi_snapshot = None
        if kpi_sub:
            kpi_snapshot = {
                "evaluator_score": kpi_sub.evaluator_score,
                "status": kpi_sub.status,
                "evaluator_feedback": kpi_sub.evaluator_feedback,
                "form_data": kpi_sub.membership_data,
                "submitted_at": kpi_sub.submitted_at.strftime("%Y-%m-%d") if kpi_sub.submitted_at else "-"
            }

        full_archive_payload = {
            "star_breakdown": scores.get("breakdown", {}),
            "pic_info": pic_snapshot,
            "submissions": submissions_snapshot,
            "kpi": kpi_snapshot
        }

        existing_archive = db.query(AnnualArchive).filter(
            AnnualArchive.year == year,
            AnnualArchive.chapter_name == chap_name
        ).first()

        if existing_archive:
            existing_archive.total_score = scores["total_score"]
            existing_archive.qualified_stars = scores["qualified_stars"]
            existing_archive.efficiency_band = scores["efficiency_band"]
            existing_archive.breakdown_json = full_archive_payload
        else:
            archive = AnnualArchive(
                year=year,
                chapter_name=chap_name,
                total_score=scores["total_score"],
                qualified_stars=scores["qualified_stars"],
                efficiency_band=scores["efficiency_band"],
                breakdown_json=full_archive_payload
            )
            db.add(archive)

        if chap_obj:
            if chap_name in new_pics_map:
                chap_obj.pic_email = new_pics_map[chap_name].get("pic_email", "")
                chap_obj.nvp_name = new_pics_map[chap_name].get("nvp_name", chap_obj.nvp_name)
            elif reset_pic_accounts:
                chap_obj.pic_email = ""

        archived_count += 1

    db.query(Submission).delete()
    db.query(KPISubmission).filter(KPISubmission.year == year).delete()

    if reset_pic_accounts:
        db.query(User).filter(
            User.role.in_([UserRole.CHAPTER_PIC, UserRole.CHAPTER_USER])
        ).update({User.is_approved: False}, synchronize_session=False)

    db.commit()
    return {
        "message": f"Siklus tahun {year} untuk {archived_count} Chapter berhasil difinalisasi & diarsipkan! Workspace siap untuk tahun {year + 1} dengan PIC baru."
    }


# ==========================================
# 5. HANDBOOK
# ==========================================

@router.get("/handbooks")
def get_admin_handbooks(db: Session = Depends(get_db)):
    return db.query(HandbookReference).order_by(HandbookReference.uploaded_at.desc()).all()


@router.post("/handbooks", status_code=status.HTTP_201_CREATED)
async def create_handbook(
    title: str = Form(...),
    category: str = Form("Handbook"),
    description: str = Form(""),
    file_url: str = Form(""),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    final_url = file_url

    if file and file.filename:
        safe_name = file.filename.replace(" ", "_")
        file_filename = f"{int(datetime.now().timestamp())}_{safe_name}"
        file_path = os.path.join(UPLOAD_DIR, file_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        final_url = f"/uploads/handbooks/{file_filename}"

    if not final_url:
        raise HTTPException(
            status_code=400, 
            detail="Harus menyertakan unggahan berkas atau tautan URL."
        )

    new_doc = HandbookReference(
        title=title,
        category=category,
        description=description,
        file_url=final_url
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {"message": "Dokumen berhasil disimpan", "data": new_doc}


@router.delete("/handbooks/{doc_id}")
def delete_handbook(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(HandbookReference).filter(HandbookReference.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")

    # Hapus juga file fisik jika tersimpan di /uploads/handbooks/
    if doc.file_url and doc.file_url.startswith("/uploads/handbooks/"):
        filename = doc.file_url.replace("/uploads/handbooks/", "")
        local_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception as e:
                print(f"Warning: gagal menghapus file fisik {local_path}: {e}")

    db.delete(doc)
    db.commit()
    return {"message": "Handbook berhasil dihapus."}