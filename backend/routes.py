import asyncio
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response

from config import (
    PROCESSING_TIMEOUT_SECONDS,
    RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_SECONDS,
)
from pipeline.remove_background import remove_background
from pipeline.validation import validate_image
from pipeline.vectorize import detail_to_params
from rate_limit import RateLimiter, client_key
from vectorize_service import run_vectorize

vectorize_limiter = RateLimiter(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS)
remove_bg_limiter = RateLimiter(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS)

router = APIRouter()


async def with_timeout(coro):
    try:
        return await asyncio.wait_for(coro, timeout=PROCESSING_TIMEOUT_SECONDS)
    except asyncio.TimeoutError as e:
        raise HTTPException(504, "La imagen tardo demasiado en procesarse. Prueba con una imagen mas simple.") from e


@router.post("/api/vectorize")
async def api_vectorize(
    request: Request,
    file: UploadFile = File(...),
    detail: float = Form(72),
    colors: int = Form(8),
    remove_bg: bool = Form(False),
    auto_colors: bool = Form(True),
):
    vectorize_limiter.check(client_key(request))
    source_bytes = await file.read()
    error = validate_image(file.content_type, source_bytes)
    if error:
        raise HTTPException(400, error)

    params = detail_to_params(detail, colors)
    suffix = Path(file.filename or "input.png").suffix or ".png"

    svg_content, bg_hex = await with_timeout(
        asyncio.to_thread(run_vectorize, source_bytes, suffix, remove_bg, colors, auto_colors, params)
    )
    headers = {"X-Bg-Color": bg_hex} if bg_hex else {}
    return Response(content=svg_content, media_type="image/svg+xml", headers=headers)


@router.post("/api/remove-background")
async def api_remove_background(request: Request, file: UploadFile = File(...)):
    remove_bg_limiter.check(client_key(request))
    source_bytes = await file.read()
    error = validate_image(file.content_type, source_bytes)
    if error:
        raise HTTPException(400, error)

    png_bytes = await with_timeout(asyncio.to_thread(remove_background, source_bytes))
    return Response(content=png_bytes, media_type="image/png")
