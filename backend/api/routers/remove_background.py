import asyncio

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response

from core.config import RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS
from core.rate_limit import RateLimiter, client_key
from core.timeout import with_timeout
from core.timing import log_duration
from pipeline.validation import validate_image
from services.remove_background_service import Quality, remove_background

router = APIRouter()

remove_bg_limiter = RateLimiter(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS)


@router.post("/api/remove-background")
async def api_remove_background(
    request: Request,
    file: UploadFile = File(...),
    quality: Quality = Form("high"),
):
    remove_bg_limiter.check(client_key(request))
    source_bytes = await file.read()
    error = validate_image(file.content_type, source_bytes)
    if error:
        raise HTTPException(400, error)

    label = f"POST /api/remove-background ({len(source_bytes) // 1024}KB, quality={quality})"
    with log_duration(label):
        png_bytes = await with_timeout(asyncio.to_thread(remove_background, source_bytes, quality))
    return Response(content=png_bytes, media_type="image/png")
