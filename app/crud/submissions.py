from sqlalchemy.orm import Session
from app.models.models import Submission
from app.schemas.schemas import SubmissionCreate

def get_submissions(db: Session, chapter_id: int = None, skip: int = 0, limit: int = 100):
    query = db.query(Submission)
    if chapter_id:
        query = query.filter(Submission.chapter_id == chapter_id)
    return query.offset(skip).limit(limit).all()

def create_submission(db: Session, submission: SubmissionCreate, user_id: int, chapter_id: int):
    db_submission = Submission(
        **submission.dict(),
        submitted_by=user_id,
        chapter_id=chapter_id
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    return db_submission