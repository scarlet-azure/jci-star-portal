from fastapi import APIRouter, Request, Depends
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/")
def home_page(request: Request):
    return templates.TemplateResponse(request=request, name="index.html", context={"title": "Dashboard"})