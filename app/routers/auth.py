import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models.models import User, UserRole
from app.schemas.schemas import (
    RegisterRequest, 
    LoginRequest, 
    ForgotPasswordRequest, 
    ResetPasswordRequest
)
from app.utils import send_reset_email

router = APIRouter()

@router.post("/register")
def register_pic(data: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar.")

    new_user = User(
        full_name=data.full_name,
        email=data.email,
        username=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.CHAPTER_USER,
        chapter_name=data.chapter_name,
        is_approved=False
    )
    db.add(new_user)
    db.commit()
    return {"message": "Registrasi berhasil! Akun Anda sedang menunggu persetujuan dari National Evaluator Desk."}

@router.post("/login")
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

@router.post("/forgot-password")
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

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email, User.reset_code == data.code).first()
    if not user or not user.reset_code_expires or user.reset_code_expires < datetime.now():
        raise HTTPException(status_code=400, detail="Kode verifikasi salah atau telah kadaluarsa.")

    user.hashed_password = hash_password(data.new_password)
    user.reset_code = None
    user.reset_code_expires = None
    db.commit()
    return {"message": "Password berhasil diperbarui! Silakan login kembali."}