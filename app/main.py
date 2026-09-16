import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash, hash_password
from app.models.models import User, UserRole
from app.routers import auth, chapters, standards, submissions, admin, public, leaderboard

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="JCI Indonesia Star Excellence API")

BASE_DIR = Path(__file__).resolve().parent

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads Directory
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Static Directory
if os.path.exists(BASE_DIR / "static"):
    app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

# Startup Hook: Root Admin Initializer
@app.on_event("startup")
def init_root_admin():
    db = SessionLocal()
    try:
        admin_email = "danielsetiawan22@gmail.com"
        root = db.query(User).filter(User.email == admin_email).first()
        if not root:
            admin_user = User(
                full_name="Daniel Setiawan (National Root Evaluator)",
                email=admin_email,
                username=admin_email,
                hashed_password=hash_password("admin123"),
                role=UserRole.ADMIN,
                chapter_name="National Board",
                is_approved=True
            )
            db.add(admin_user)
            db.commit()
            print(f"Root Admin initialized: {admin_email}")
    except Exception as e:
        print("Error initializing root admin:", e)
    finally:
        db.close()

# Include Modular Routers
app.include_router(public.router)
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(chapters.router, prefix="/chapters", tags=["Chapters"])
app.include_router(standards.router, tags=["Standards"])
app.include_router(submissions.router, prefix="/submissions", tags=["Submissions"])
app.include_router(leaderboard.router, tags=["Leaderboard"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])