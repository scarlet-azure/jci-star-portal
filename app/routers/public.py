from typing import List
from fastapi import APIRouter, Request, Depends
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import HandbookReference
from app.schemas.schemas import HandbookResponse

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/")
def home_page(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="index.html", 
        context={"title": "Dashboard"}
    )

@router.get("/handbooks", response_model=List[HandbookResponse])
def get_all_handbooks(db: Session = Depends(get_db)):
    return db.query(HandbookReference).order_by(HandbookReference.uploaded_at.desc()).all()