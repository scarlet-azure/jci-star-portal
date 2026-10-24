import time
from collections import defaultdict
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class SecurityProtectionMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests_per_minute: int = 120):
        super().__init__(app)
        self.max_rpm = max_requests_per_minute
        self.ip_requests = defaultdict(list)
        self.failed_logins = defaultdict(list)
        self.locked_ips = {}

    def get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next):
        now = time.time()
        ip = self.get_client_ip(request)

        # 1. Cek apakah IP sedang di-lockout karena Brute Force Login
        if ip in self.locked_ips:
            if now < self.locked_ips[ip]:
                retry_in = int(self.locked_ips[ip] - now)
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": f"Terlalu banyak percobaan gagal. Coba lagi dalam {retry_in} detik."}
                )
            else:
                del self.locked_ips[ip]

        # 2. Global Rate Limiting per IP (Anti-Spam / Application DDoS)
        self.ip_requests[ip] = [t for t in self.ip_requests[ip] if now - t < 60]
        if len(self.ip_requests[ip]) >= self.max_rpm:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Batas request terlampaui. Mohon tunggu sebentar."}
            )
        self.ip_requests[ip].append(now)

        response = await call_next(request)

        # 3. Deteksi Gagal Login (Brute-Force Tracker pada /api/auth/login)
        if request.url.path.endswith("/login") and response.status_code == 401:
            self.failed_logins[ip] = [t for t in self.failed_logins[ip] if now - t < 300]
            self.failed_logins[ip].append(now)
            # Jika gagal 5x dalam 5 menit -> Kunci IP selama 15 menit (900 detik)
            if len(self.failed_logins[ip]) >= 5:
                self.locked_ips[ip] = now + 900

        # 4. Tambahkan Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
            "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com;"
        )

        return response