from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.router import router
from core.config import CORS_ALLOWED_ORIGINS
from core.exception_handlers import unhandled_exception_handler
from core.logging import configure_logging
from core.security_headers import SecurityHeadersMiddleware

configure_logging()

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"

app = FastAPI(title="TraceFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Bg-Color"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(router)

if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")
