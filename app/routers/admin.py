from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["Admin Desk"])

@router.get("/pending-users")
async def get_pending_users():
    return []

@router.put("/approve-user/{user_id}")
async def approve_user(user_id: int, action: str):
    return {"message": f"User {action}d"}

@router.put("/verify/{sub_id}")
async def verify_submission(sub_id: int):
    return {"message": "Submission verified"}