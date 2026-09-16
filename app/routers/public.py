from fastapi import APIRouter

router = APIRouter(tags=["Public & Analytics"])

@router.get("/leaderboard")
async def get_leaderboard():
    return []

@router.get("/archives/{chapter_name}")
async def get_archives(chapter_name: str):
    return []