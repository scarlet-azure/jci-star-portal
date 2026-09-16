from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Chapter
from app.utils import calculate_chapter_scores

router = APIRouter()

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    chapters = db.query(Chapter).all()
    leaderboard = []

    for chap in chapters:
        scores = calculate_chapter_scores(db, chap.name)
        leaderboard.append(scores)

    leaderboard.sort(key=lambda x: (x["qualified_stars"], x["total_score"]), reverse=True)

    for rank, item in enumerate(leaderboard, start=1):
        item["rank"] = rank

    return leaderboard