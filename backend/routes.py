import asyncio
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response

from pipeline.remove_background import remove_background
from pipeline.validation import validate_image
from pipeline.vectorize import detail_to_params
from rate_limit import RateLimiter, client_key
from vectorize_service import run_vectorize

# El primer llamado a rembg carga el modelo BiRefNet (~90s en CPU) antes de
# procesar; despues queda cacheado en memoria y cada imagen tarda unos
# segundos. El timeout cubre ese arranque en frio.
PROCESSING_TIMEOUT_SECONDS = 180

# 10 peticiones por minuto por IP en los dos endpoints pesados: sin esto,
# cualquiera puede mandar cientos de conversiones seguidas y disparar el
# costo de CPU/tiempo del servidor (cada una puede tardar varios segundos,
# hasta 180s en el peor caso).
vectorize_limiter = RateLimiter(max_requests=10, window_seconds=60)
remove_bg_limiter = RateLimiter(max_requests=10, window_seconds=60)

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
