from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Standard

router = APIRouter(prefix="/standards", tags=["Standards"])

@router.get("")
@router.get("/")
def get_standards(db: Session = Depends(get_db)):
    standards = db.query(Standard).all()
    
    # Konversi manual ke dict agar Enum 'star' terkonversi murni jadi String 
    # dan tidak merusak serialisasi JSON FastAPI
    result = []
    for s in standards:
        star_val = s.star.value if hasattr(s.star, 'value') else str(s.star)
        result.append({
            "id": s.id,
            "name": s.name,
            "star": star_val,
            "purpose": s.purpose,
            "requirement": s.requirement,
            "evidence_guide": s.evidence_guide,
            "max_score": s.max_score,
            "deadline": s.deadline,
            "active_status": s.active_status
        })
    return result