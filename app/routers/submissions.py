import os
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Submission, SubmissionStatus

router = APIRouter()

@router.get("/{chapter_name}")
def get_chapter_submissions(chapter_name: str, db: Session = Depends(get_db)):
    return db.query(Submission).filter(
        Submission.chapter_name.ilike(chapter_name)
    ).all()

@router.post("/")
async def create_or_update_submission(
    standard_id: str = Form(...),
    chapter_name: str = Form("JCI Jakarta"),
    title: str = Form(...),
    description: str = Form(...),
    evidence_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    existing = db.query(Submission).filter(
        Submission.standard_id == standard_id,
        Submission.chapter_name.ilike(chapter_name)
    ).first()

    file_path = None
    if file:
        file_filename = f"{int(datetime.now().timestamp())}_{file.filename}"
        file_path = f"uploads/{file_filename}"
        with open(file_path, "wb") as f:
            f.write(await file.read())

    if existing:
        existing.title = title
        existing.description = description
        if evidence_url: existing.url = evidence_url
        if file_path: existing.file = file_path
        existing.status = SubmissionStatus.PENDING
        existing.submitted_at = datetime.now(timezone.utc)
        db.commit()
        return {"message": "Submission berhasil diperbarui!"}
    else:
        new_sub = Submission(
            standard_id=standard_id,
            chapter_name=chapter_name,
            title=title,
            description=description,
            url=evidence_url,
            file=file_path,
            status=SubmissionStatus.PENDING,
            score_earned=0
        )
        db.add(new_sub)
        db.commit()
        return {"message": "Submission berhasil dibuat!"}