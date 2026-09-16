import os
import pathlib
import secrets
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, Path, status, UploadFile, Form, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from fastapi.templating import Jinja2Templates

app = FastAPI()

# Dapatkan path absolut direktori 'app' menggunakan pathlib.Path
BASE_DIR = pathlib.Path(__file__).resolve().parent

# Mount folder static & templates
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

@app.get("/")
async def render_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# ---------------------------------------------------------
# DATABASE SETUP
# ---------------------------------------------------------
SQLALCHEMY_DATABASE_URL = "sqlite:///./jci_star_portal.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---------------------------------------------------------
# ENUMS & MODELS
# ---------------------------------------------------------
class UserRole(str, Enum):
    ADMIN = "ADMIN"
    CHAPTER_PIC = "CHAPTER_PIC"

class SubmissionStatus(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REVISION_REQUESTED = "Revision Requested"
    REJECTED = "Rejected"

class StarCategory(str, Enum):
    EFFICIENCY = "EFFICIENCY"
    NETWORK = "NETWORK"
    EXPERIENCE = "EXPERIENCE"
    OUTREACH = "OUTREACH"
    IMPACT = "IMPACT"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True)
    hashed_password = Column(String)
    role = Column(SQLEnum(UserRole), default=UserRole.CHAPTER_PIC)
    chapter_name = Column(String, nullable=True)
    is_approved = Column(Boolean, default=False)
    reset_code = Column(String, nullable=True)
    reset_code_expires = Column(DateTime, nullable=True)

class Standard(Base):
    __tablename__ = "standards"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    star = Column(SQLEnum(StarCategory))
    purpose = Column(String, nullable=True)
    requirement = Column(String, nullable=True)
    evidence_guide = Column(String, nullable=True)
    max_score = Column(Integer, default=10)
    deadline = Column(String, nullable=True)

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, index=True)
    standard_id = Column(String, index=True)
    chapter_name = Column(String, index=True)
    title = Column(String)
    description = Column(String)
    url = Column(String, nullable=True)
    file = Column(String, nullable=True)
    status = Column(SQLEnum(SubmissionStatus), default=SubmissionStatus.PENDING)
    score_earned = Column(Integer, default=0)
    evaluator_notes = Column(String, nullable=True)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    evaluated_at = Column(DateTime, nullable=True)

class Chapter(Base):
    __tablename__ = "chapters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class AnnualArchive(Base):
    __tablename__ = "annual_archives"
    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, index=True)
    chapter_name = Column(String, index=True)
    total_score = Column(Integer)
    qualified_stars = Column(Integer)
    efficiency_band = Column(String)
    breakdown_json = Column(JSON)

Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------
# UTILS & HELPERS
# ---------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    return pwd_context.hash(pwd_bytes.decode('utf-8', errors='ignore'))

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        return pwd_context.verify(pwd_bytes.decode('utf-8', errors='ignore'), hashed_password)
    except Exception:
        return plain_password == hashed_password

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def send_reset_email(to_email: str, code: str):
    print(f"[EMAIL MOCK] Verification OTP Code for {to_email}: {code}")

def calculate_chapter_scores(db: Session, chapter_name: str):
    # Hilangkan imbuhan "JCI " jika user memanggil "JCI Jakarta" atau "Jakarta"
    clean_chap = chapter_name.replace("JCI ", "").strip()

    submissions = db.query(Submission).filter(
        Submission.chapter_name.ilike(f"%{clean_chap}%"),
        Submission.status == SubmissionStatus.APPROVED
    ).all()

    breakdown = {
        "Efficiency": 0,
        "Network": 0,
        "Experience": 0,
        "Outreach": 0,
        "Impact": 0
    }

    for sub in submissions:
        std = db.query(Standard).filter(Standard.id == sub.standard_id).first()
        if std:
            # Ambil nilai string murni dari Enum/String
            raw_star = std.star.value if hasattr(std.star, 'value') else str(std.star)
            raw_star = raw_star.split('.')[-1].upper() # Ambil kata terakhir (misal EFFICIENCY)

            # Mapping ke key breakdown
            star_map = {
                "EFFICIENCY": "Efficiency",
                "NETWORK": "Network",
                "EXPERIENCE": "Experience",
                "OUTREACH": "Outreach",
                "IMPACT": "Impact"
            }
            
            target_key = star_map.get(raw_star)
            if target_key:
                breakdown[target_key] += (sub.score_earned or 0)

    total_score = sum(breakdown.values())
    eff_score = breakdown["Efficiency"]

    if eff_score >= 135:
        band = "Ultra Efficient Local Organization Management"
    elif eff_score >= 120:
        band = "Super Efficient Local Organization Management"
    elif eff_score >= 100:
        band = "Efficient Local Organization Management"
    elif eff_score >= 90:
        band = "Good Local Organization Management"
    else:
        band = "Under Minimum Standard (<90 pts)"

    qualified_stars = 0
    if eff_score >= 100: qualified_stars += 1
    eff_passed = eff_score >= 90
    if eff_passed and breakdown["Network"] >= 250: qualified_stars += 1
    if eff_passed and breakdown["Experience"] >= 250: qualified_stars += 1
    if eff_passed and breakdown["Outreach"] >= 250: qualified_stars += 1
    if eff_passed and breakdown["Impact"] >= 250: qualified_stars += 1

    return {
        "chapter_name": chapter_name,
        "total_score": total_score,
        "efficiency_band": band,
        "qualified_stars": qualified_stars,
        "breakdown": breakdown
    }

# ---------------------------------------------------------
# FASTAPI APP & SCHEMAS
# ---------------------------------------------------------
app = FastAPI(title="JCI Indonesia Star Excellence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Pydantic Schemas
class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    chapter_name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

class ChapterCreate(BaseModel):
    name: str

class StandardCreate(BaseModel):
    id: str
    name: str
    star: str
    purpose: Optional[str] = ""
    requirement: Optional[str] = ""
    evidence_guide: Optional[str] = ""
    max_score: int
    deadline: str

class StandardUpdate(BaseModel):
    name: str
    star: str
    purpose: Optional[str] = ""
    requirement: Optional[str] = ""
    evidence_guide: Optional[str] = ""
    max_score: int
    deadline: str

class AuditPayload(BaseModel):
    status: str
    score_earned: Optional[int] = 0
    evaluator_notes: Optional[str] = ""

# ---------------------------------------------------------
# STARTUP HOOK
# ---------------------------------------------------------
@app.on_event("startup")
def init_root_admin():
    db = SessionLocal()
    try:
        # 1. Inisialisasi Default Admin
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
        print("Error initializing root admin / chapters:", e)
    finally:
        db.close()

# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------
@app.get("/")
def read_root():
    return FileResponse("index.html")

@app.get("/chapters")
def get_chapters(db: Session = Depends(get_db)):
    return db.query(Chapter).all()

@app.post("/chapters")
def add_chapter(data: ChapterCreate, db: Session = Depends(get_db)):
    existing = db.query(Chapter).filter(Chapter.name.ilike(data.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Nama Chapter sudah ada.")
    new_chap = Chapter(name=data.name)
    db.add(new_chap)
    db.commit()
    return {"message": f"Chapter {data.name} berhasil ditambahkan!"}

@app.delete("/chapters/{chap_name}")
def delete_chapter(chap_name: str, db: Session = Depends(get_db)):
    chap = db.query(Chapter).filter(Chapter.name.ilike(chap_name)).first()
    if not chap:
        raise HTTPException(status_code=404, detail="Chapter tidak ditemukan.")
    db.delete(chap)
    db.commit()
    return {"message": f"Chapter {chap_name} berhasil dihapus!"}

@app.post("/auth/register")
def register_pic(data: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar.")

    new_user = User(
        full_name=data.full_name,
        email=data.email,
        username=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.CHAPTER_PIC,
        chapter_name=data.chapter_name,
        is_approved=False
    )
    db.add(new_user)
    db.commit()
    return {"message": "Registrasi berhasil! Akun Anda sedang menunggu persetujuan dari National Evaluator Desk."}

@app.post("/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email atau password yang Anda masukkan salah.")
    
    role_str = user.role.value if hasattr(user.role, 'value') else str(user.role)

    if role_str != "ADMIN" and not user.is_approved:
        raise HTTPException(status_code=403, detail="Akun Anda masih menunggu persetujuan dari National Evaluator Desk.")

    return {
        "message": "Login berhasil",
        "email": user.email,
        "full_name": user.full_name or user.email,
        "role": role_str,
        "chapter_name": user.chapter_name or "JCI Jakarta"
    }

@app.post("/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email tidak terdaftar.")

    code = f"{secrets.randbelow(899999) + 100000}"
    user.reset_code = code
    user.reset_code_expires = datetime.now() + timedelta(minutes=15)
    db.commit()

    send_reset_email(data.email, code)
    return {"message": f"Kode OTP verifikasi telah dikirim ke email {data.email}."}

@app.post("/auth/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email, User.reset_code == data.code).first()
    if not user or not user.reset_code_expires or user.reset_code_expires < datetime.now():
        raise HTTPException(status_code=400, detail="Kode verifikasi salah atau telah kadaluarsa.")

    user.hashed_password = hash_password(data.new_password)
    user.reset_code = None
    user.reset_code_expires = None
    db.commit()
    return {"message": "Password berhasil diperbarui! Silakan login kembali."}

# ---------------------------------------------------------
# ADMIN & STANDARDS MANAGEMENT
# ---------------------------------------------------------
@app.get("/admin/pending-users")
def get_pending_users(db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == UserRole.CHAPTER_PIC, User.is_approved == False).all()

@app.put("/admin/approve-user/{user_id}")
def approve_user(user_id: int, action: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    if action == "approve":
        user.is_approved = True
        db.commit()
        return {"message": f"User {user.full_name} berhasil disetujui."}
    else:
        db.delete(user)
        db.commit()
        return {"message": f"Pendaftaran {user.full_name} ditolak dan dihapus."}

@app.get("/standards")
def get_standards(db: Session = Depends(get_db)):
    return db.query(Standard).all()

@app.post("/standards")
def create_standard(std: StandardCreate, db: Session = Depends(get_db)):
    existing = db.query(Standard).filter(Standard.id == std.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Standard ID sudah terdaftar.")
    new_std = Standard(
        id=std.id,
        name=std.name,
        star=std.star.upper(),
        purpose=std.purpose,
        requirement=std.requirement,
        evidence_guide=std.evidence_guide,
        max_score=std.max_score,
        deadline=std.deadline
    )
    db.add(new_std)
    db.commit()
    return {"message": f"Standard {std.id} berhasil ditambahkan"}

@app.put("/standards/{std_id}")
def update_standard(std_id: str, std: StandardUpdate, db: Session = Depends(get_db)):
    existing = db.query(Standard).filter(Standard.id == std_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Standard tidak ditemukan.")
    existing.name = std.name
    existing.star = std.star.upper()
    existing.purpose = std.purpose
    existing.requirement = std.requirement
    existing.evidence_guide = std.evidence_guide
    existing.max_score = std.max_score
    existing.deadline = std.deadline
    db.commit()
    return {"message": f"Standard {std_id} berhasil diperbarui!"}

@app.delete("/standards/{std_id}")
def delete_standard(std_id: str, db: Session = Depends(get_db)):
    std = db.query(Standard).filter(Standard.id == std_id).first()
    if not std:
        raise HTTPException(status_code=404, detail="Standard tidak ditemukan.")
    db.query(Submission).filter(Submission.standard_id == std_id).delete()
    db.delete(std)
    db.commit()
    return {"message": f"Standard {std_id} berhasil dihapus"}

# ---------------------------------------------------------
# SUBMISSIONS MANAGEMENT
# ---------------------------------------------------------
@app.get("/submissions/{chapter_name}")
def get_chapter_submissions(chapter_name: str, db: Session = Depends(get_db)):
    return db.query(Submission).filter(
        Submission.chapter_name.ilike(chapter_name)
    ).all()

@app.post("/submissions")
async def create_or_update_submission(
    standard_id: str = Form(...),
    chapter_name: str = Form("JCI Jakarta"),
    title: str = Form(...),
    description: str = Form(...),
    evidence_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    existing = db.query(Submission).filter(
        Submission.standard_id == standard_id,
        Submission.chapter_name.ilike(chapter_name)
    ).first()

    file_path = None
    if file:
        file_filename = f"{int(datetime.now().timestamp())}_{file.filename}"
        file_path = f"uploads/{file_filename}"
        with open(file_path, "wb") as f:
            f.write(await file.read())

    if existing:
        existing.title = title
        existing.description = description
        if evidence_url: existing.url = evidence_url
        if file_path: existing.file = file_path
        existing.status = SubmissionStatus.PENDING
        existing.submitted_at = datetime.now(timezone.utc)
        db.commit()
        return {"message": "Submission berhasil diperbarui!"}
    else:
        new_sub = Submission(
            standard_id=standard_id,
            chapter_name=chapter_name,
            title=title,
            description=description,
            url=evidence_url,
            file=file_path,
            status=SubmissionStatus.PENDING,
            score_earned=0
        )
        db.add(new_sub)
        db.commit()
        return {"message": "Submission berhasil dibuat!"}

@app.put("/admin/verify/{submission_id}")
def verify_submission(
    submission_id: int,
    payload: AuditPayload,
    db: Session = Depends(get_db)
):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission tidak ditemukan.")

    sub.status = payload.status
    sub.score_earned = payload.score_earned
    sub.evaluator_notes = payload.evaluator_notes
    sub.evaluated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Status verifikasi berhasil diperbarui!"}

# ---------------------------------------------------------
# LEADERBOARD & ARCHIVES
# ---------------------------------------------------------
@app.get("/leaderboard")
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

@app.post("/admin/archive-year/{year}")
def archive_annual_cycle(year: int, db: Session = Depends(get_db)):
    chapters = db.query(Chapter).all()
    for chap in chapters:
        scores = calculate_chapter_scores(db, chap.name)
        archive = AnnualArchive(
            year=year,
            chapter_name=chap.name,
            total_score=scores["total_score"],
            qualified_stars=scores["qualified_stars"],
            efficiency_band=scores["efficiency_band"],
            breakdown_json=scores["breakdown"]
        )
        db.add(archive)
    
    db.query(Submission).delete()
    db.commit()
    return {"message": f"Siklus tahun {year} berhasil diarsipkan dan data submission di-reset!"}

@app.get("/archives/{chapter_name}")
def get_chapter_archives(chapter_name: str, db: Session = Depends(get_db)):
    return db.query(AnnualArchive).filter(
        AnnualArchive.chapter_name.ilike(chapter_name)
    ).order_by(AnnualArchive.year.desc()).all()