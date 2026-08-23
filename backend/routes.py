import asyncio
import base64
import json
import time
from pathlib import Path
from typing import AsyncIterator, Iterator

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response, StreamingResponse

from config import (
    PROCESSING_TIMEOUT_SECONDS,
    RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_SECONDS,
)
from pipeline.remove_background import remove_background
from pipeline.validation import validate_image
from pipeline.vectorize import detail_to_params
from rate_limit import RateLimiter, client_key
from timing import log_duration
from vectorize_service import VectorizeStage, run_vectorize, run_vectorize_stages

vectorize_limiter = RateLimiter(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS)
remove_bg_limiter = RateLimiter(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS)

router = APIRouter()


async def with_timeout(coro):
    try:
        return await asyncio.wait_for(coro, timeout=PROCESSING_TIMEOUT_SECONDS)
    except asyncio.TimeoutError as e:
        raise HTTPException(504, "La imagen tardo demasiado en procesarse. Prueba con una imagen mas simple.") from e


async def _stream_stages(sync_gen: Iterator[VectorizeStage], timeout_seconds: float) -> AsyncIterator[VectorizeStage]:
    """Puentea el generador sincrono (bloqueante) de run_vectorize_stages
    a un generador async: cada paso corre en un hilo aparte via
    asyncio.to_thread, para no congelar el event loop mientras
    vtracer/rembg procesan esa etapa. El limite de tiempo se mide sobre
    el total (igual que with_timeout), no por etapa individual -- si se
    agota, se manda una etapa "error" en vez de cortar la conexion a
    medio mandar (los headers ya se enviaron, no se puede lanzar un
    HTTPException a esta altura).
    """
    it = iter(sync_gen)
    start = time.monotonic()
    while True:
        remaining = timeout_seconds - (time.monotonic() - start)
        if remaining <= 0:
            yield {"stage": "error", "message": "La imagen tardo demasiado en procesarse. Prueba con una imagen mas simple."}
            return
        try:
            item = await asyncio.wait_for(asyncio.to_thread(next, it), timeout=remaining)
        except StopIteration:
            return
        except asyncio.TimeoutError:
            yield {"stage": "error", "message": "La imagen tardo demasiado en procesarse. Prueba con una imagen mas simple."}
            return
        yield item


def _format_sse(stage: VectorizeStage) -> str:
    if "svg" in stage:
        payload = {"stage": stage["stage"], "svg": stage["svg"], "bgHex": stage.get("bg_hex")}
    elif "image" in stage:
        b64 = base64.b64encode(stage["image"]).decode("ascii")
        payload = {"stage": stage["stage"], "image": f"data:image/png;base64,{b64}"}
    else:
        payload = dict(stage)
    return f"data: {json.dumps(payload)}\n\n"


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

    label = f"POST /api/vectorize ({len(source_bytes) // 1024}KB, remove_bg={remove_bg}, auto_colors={auto_colors})"
    with log_duration(label):
        svg_content, bg_hex = await with_timeout(
            asyncio.to_thread(run_vectorize, source_bytes, suffix, remove_bg, colors, auto_colors, params)
        )
    headers = {"X-Bg-Color": bg_hex} if bg_hex else {}
    return Response(content=svg_content, media_type="image/svg+xml", headers=headers)


@router.post("/api/vectorize/stream")
async def api_vectorize_stream(
    request: Request,
    file: UploadFile = File(...),
    detail: float = Form(72),
    colors: int = Form(8),
    remove_bg: bool = Form(False),
    auto_colors: bool = Form(True),
):
    """Igual que /api/vectorize, pero mandando cada etapa del pipeline
    (original, ampliada, sin fondo/colores, resultado final) segun se
    va completando, en vez de una sola respuesta al terminar todo --
    para el preview en vivo del proceso en el frontend."""
    vectorize_limiter.check(client_key(request))
    source_bytes = await file.read()
    error = validate_image(file.content_type, source_bytes)
    if error:
        raise HTTPException(400, error)

    params = detail_to_params(detail, colors)
    suffix = Path(file.filename or "input.png").suffix or ".png"

    async def event_stream():
        gen = run_vectorize_stages(source_bytes, suffix, remove_bg, colors, auto_colors, params)
        async for stage in _stream_stages(gen, PROCESSING_TIMEOUT_SECONDS):
            yield _format_sse(stage)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/api/remove-background")
async def api_remove_background(request: Request, file: UploadFile = File(...)):
    remove_bg_limiter.check(client_key(request))
    source_bytes = await file.read()
    error = validate_image(file.content_type, source_bytes)
    if error:
        raise HTTPException(400, error)

    label = f"POST /api/remove-background ({len(source_bytes) // 1024}KB)"
    with log_duration(label):
        png_bytes = await with_timeout(asyncio.to_thread(remove_background, source_bytes))
    return Response(content=png_bytes, media_type="image/png")
