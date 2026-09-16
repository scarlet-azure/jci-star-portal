from passlib.context import CryptContext

# Setup password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Mengubah plain text password menjadi hash aman"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Memverifikasi password saat login"""
    return pwd_context.verify(plain_password, hashed_password)