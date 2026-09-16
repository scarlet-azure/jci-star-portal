from fastapi import APIRouter

router = APIRouter(prefix="/chapters", tags=["Chapters"])

@router.get("")
async def get_chapters():
    return []

@router.post("")
async def create_chapter():
    return {"message": "Chapter added"}

@router.delete("/{name}")
async def delete_chapter(name: str):
    return {"message": "Chapter deleted"}