from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Chapter
from app.schemas.schemas import ChapterCreate, ChapterResponse  # Sesuaikan schema kamu

router = APIRouter()

# 1. PASTIKAN RUTE GET INI ADA (Menangani GET /chapters)
@router.get("/", response_model=List[ChapterResponse])
def get_chapters(db: Session = Depends(get_db)):
    """Mengambil daftar seluruh chapter JCI"""
    return db.query(Chapter).all()

# 2. RUTE POST (Menangani POST /chapters)
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_chapter(chapter_in: ChapterCreate, db: Session = Depends(get_db)):
    """Menambahkan chapter baru"""
    existing = db.query(Chapter).filter(Chapter.name == chapter_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Chapter sudah terdaftar.")
    
    new_chapter = Chapter(name=chapter_in.name)
    db.add(new_chapter)
    db.commit()
    db.refresh(new_chapter)
    return {"message": "Chapter berhasil ditambahkan", "data": new_chapter}

# 3. RUTE DELETE (Menangani DELETE /chapters/{chapter_name})
@router.delete("/{chapter_name}")
def delete_chapter(chapter_name: str, db: Session = Depends(get_db)):
    """Menghapus chapter"""
    chap = db.query(Chapter).filter(Chapter.name == chapter_name).first()
    if not chap:
        raise HTTPException(status_code=404, detail="Chapter tidak ditemukan.")
    
    db.delete(chap)
    db.commit()
    return {"message": f"Chapter '{chapter_name}' berhasil dihapus."}