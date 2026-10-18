import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import KPISubmission, User, UserRole
from app.schemas.schemas import (
    KPISubmissionCreate,
    KPISubmissionResponse,
    KPISubmissionReview,
)

router = APIRouter(prefix="/kpi", tags=["KPI Self-Assessment"])

SCHEMA_FILE_PATH = "app/data/kpi_schema.json"


# ==========================================
# 1. KPI SCHEMA / TEMPLATE MANAGEMENT
# ==========================================

@router.get("/schema")
def get_kpi_schema():
    """Mendapatkan struktur skema/template formulir KPI Self-Assessment."""
    if os.path.exists(SCHEMA_FILE_PATH):
        try:
            with open(SCHEMA_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading schema file: {e}")
            return []
    return []


@router.get("/template")
def get_kpi_template_fallback():
    """Fallback endpoint untuk mendapatkan skema template KPI."""
    return get_kpi_schema()


@router.put("/schema")
def update_kpi_schema(payload: Any = Body(...)):
    """
    Menyimpan atau memperbarui seluruh struktur skema/template KPI Self-Assessment.
    Mendukung payload langsung berupa list atau objek bertipe {"schema": [...]}.
    """
    try:
        os.makedirs(os.path.dirname(SCHEMA_FILE_PATH), exist_ok=True)

        # Ekstrak data jika payload terbungkus atribut "schema"
        data_to_save = payload.get("schema", payload) if isinstance(payload, dict) else payload

        with open(SCHEMA_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(data_to_save, f, indent=2, ensure_ascii=False)

        return {"message": "Struktur Form KPI berhasil disimpan!"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal menyimpan skema KPI: {str(e)}"
        )


@router.put("/template/{field_key}")
def update_kpi_template_field(field_key: str, payload: Dict[str, Any] = Body(...)):
    """Memperbarui satu item field kriteria pada skema flat fallback."""
    schema = get_kpi_schema()
    updated = False

    if isinstance(schema, list):
        for item in schema:
            if isinstance(item, dict):
                # Struktur nested tab (fields[])
                if "fields" in item and isinstance(item["fields"], list):
                    for f in item["fields"]:
                        if f.get("key") == field_key:
                            f.update(payload)
                            updated = True
                            break
                # Struktur flat field
                elif item.get("key") == field_key:
                    item.update(payload)
                    updated = True
                    break

    if not updated:
        raise HTTPException(status_code=404, detail="Field kriteria tidak ditemukan dalam skema.")

    update_kpi_schema(schema)
    return {"message": f"Kriteria {field_key} berhasil diperbarui!"}


# ==========================================
# 2. CHAPTER KPI SUBMISSION MANAGEMENT
# ==========================================

@router.get("/my-submission", response_model=Optional[KPISubmissionResponse])
def get_my_chapter_submission(
    chapter_name: Optional[str] = None,
    year: int = 2026,
    db: Session = Depends(get_db)
):
    """Mendapatkan data pengajuan KPI Self-Assessment milik chapter terkait."""
    query = db.query(KPISubmission).filter(KPISubmission.year == year)
    if chapter_name:
        query = query.filter(KPISubmission.chapter_name == chapter_name)

    submission = query.order_by(KPISubmission.submitted_at.desc()).first()
    return submission


@router.post("/submit", response_model=KPISubmissionResponse, status_code=status.HTTP_201_CREATED)
def submit_or_update_kpi(payload: KPISubmissionCreate, db: Session = Depends(get_db)):
    """Mengirimkan atau memperbarui borang pengajuan KPI Self-Assessment Chapter."""
    existing = db.query(KPISubmission).filter(
        KPISubmission.chapter_name == payload.chapter_name,
        KPISubmission.year == payload.year
    ).first()

    data_dict = payload.model_dump(exclude_unset=True)

    # Pastikan form_data & membership_data tersimpan dengan benar
    if "form_data" in data_dict and data_dict["form_data"] is not None:
        if isinstance(data_dict["form_data"], dict):
            data_dict["form_data"] = data_dict["form_data"]
    if "membership_data" in data_dict and data_dict["membership_data"] is not None:
        if isinstance(data_dict["membership_data"], dict):
            data_dict["membership_data"] = data_dict["membership_data"]

    if existing:
        for key, val in data_dict.items():
            setattr(existing, key, val)
        existing.submitted_at = datetime.now()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_sub = KPISubmission(**data_dict)
        db.add(new_sub)
        db.commit()
        db.refresh(new_sub)
        return new_sub

# ==========================================
# 3. ADMIN EVALUATOR AUDIT & REVIEWS
# ==========================================

@router.get("/admin/submissions", response_model=List[KPISubmissionResponse])
def get_all_kpi_submissions(year: int = 2026, db: Session = Depends(get_db)):
    """Mendapatkan seluruh daftar pengajuan KPI dari seluruh Local Chapter."""
    return db.query(KPISubmission).filter(KPISubmission.year == year).all()


@router.put("/admin/{sub_id}/review", response_model=KPISubmissionResponse)
def review_kpi_submission(
    sub_id: int,
    payload: KPISubmissionReview,
    db: Session = Depends(get_db)
):
    """Verifikasi audit skor dan feedback evaluator untuk pengajuan KPI Chapter."""
    sub = db.query(KPISubmission).filter(KPISubmission.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Pengajuan KPI tidak ditemukan.")

    sub.evaluator_score = payload.evaluator_score
    sub.evaluator_feedback = payload.evaluator_feedback
    sub.status = payload.status
    sub.evaluated_at = datetime.now()

    db.commit()
    db.refresh(sub)
    return sub