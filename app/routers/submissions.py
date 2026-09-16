from fastapi import APIRouter, UploadFile, File, Form

router = APIRouter(prefix="/submissions", tags=["Submissions"])

@router.get("/{chapter_name}")
async def get_submissions(chapter_name: str):
    return []

@router.post("")
async def create_submission():
    return {"message": "Submission received"}