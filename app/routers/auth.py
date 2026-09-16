from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
# import modul database, model, & schema kamu di sini

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login")
async def login():
    # Logika login
    return {"message": "Login success"}

@router.post("/register")
async def register():
    # Logika registrasi
    return {"message": "Register success"}

@router.post("/forgot-password")
async def forgot_password():
    return {"message": "OTP sent"}

@router.post("/reset-password")
async def reset_password():
    return {"message": "Password updated"}