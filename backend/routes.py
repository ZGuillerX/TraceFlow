import asyncio
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
from rate_limit import ConcurrencyLimiter, RateLimiter, client_key
from timing import log_duration
from vectorize_service import VectorizeStage, run_vectorize, run_vectorize_stages

vectorize_limiter = RateLimiter(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS)
remove_bg_limiter = RateLimiter(RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS)
# compartido entre /api/vectorize y /api/vectorize/stream: ambos corren
# el mismo pipeline pesado, un cliente no deberia poder eludir el
# limite alternando entre los dos endpoints.
vectorize_concurrency = ConcurrencyLimiter(max_concurrent=1)

router = APIRouter()


async def with_timeout(coro):
    try:
        return await asyncio.wait_for(coro, timeout=PROCESSING_TIMEOUT_SECONDS)
    except asyncio.TimeoutError as e:
        raise HTTPException(504, "La imagen tardo demasiado en procesarse. Prueba con una imagen mas simple.") from e


_STREAM_DONE = object()


def _advance(it: Iterator[VectorizeStage]):
    # next(it) directo lanzaria StopIteration al agotarse, pero eso
    # cruzaria la frontera del hilo via asyncio.to_thread -- asyncio
    # prohibe propagar StopIteration a un Future (PEP 479) y la
    # convierte en un TypeError que rompe el generador async sin cerrar
    # el stream HTTP correctamente (el cliente ve "response ended
    # prematurely" en vez de un cierre limpio). Un sentinel evita que
    # StopIteration llegue a cruzar esa frontera.
    return next(it, _STREAM_DONE)


async def _drain_remaining(it: Iterator[VectorizeStage], key: str) -> None:
    """Sigue consumiendo el generador sincrono EN SEGUNDO PLANO hasta
    que el trabajo pesado termine de verdad (o falle), sin yieldear
    nada -- se usa cuando se corto el streaming antes de tiempo
    (desconexion del cliente o timeout) y todavia queda trabajo
    pendiente. El hilo ya lanzado via asyncio.to_thread no se puede
    interrumpir a medio trabajo, asi que la unica forma honesta de
    saber que el slot de concurrencia esta libre es esperar a que
    efectivamente termine, aunque ya nadie este esperando el resultado
    -- liberar antes permitiria que se acumulen tantos hilos zombie
    como cancelaciones rapidas haga el cliente (visto en produccion:
    varias cancelaciones seguidas hicieron que una sola etapa pasara
    de 3s a 13s por la competencia en el pool de hilos compartido).
    """
    try:
        while True:
            item = await asyncio.to_thread(_advance, it)
            if item is _STREAM_DONE:
                return
    except Exception:
        pass
    finally:
        vectorize_concurrency.release(key)


async def _stream_stages(
    sync_gen: Iterator[VectorizeStage], timeout_seconds: float, request: Request, key: str
) -> AsyncIterator[VectorizeStage]:
    """Puentea el generador sincrono (bloqueante) de run_vectorize_stages
    a un generador async: cada paso corre en un hilo aparte via
    asyncio.to_thread, para no congelar el event loop mientras
    vtracer/rembg procesan esa etapa. El limite de tiempo se mide sobre
    el total (igual que with_timeout), no por etapa individual -- si se
    agota, se manda una etapa "error" en vez de cortar la conexion a
    medio mandar (los headers ya se enviaron, no se puede lanzar un
    HTTPException a esta altura).

    Entre etapa y etapa se revisa si el cliente cancelo (cerro la
    conexion, p. ej. le dio a "Cancelar"): un hilo ya lanzado con
    asyncio.to_thread no se puede interrumpir a medio trabajo (vtracer
    es codigo nativo bloqueante, no hay forma de pedirle que pare), pero
    si se puede evitar lanzar la SIGUIENTE etapa que aun no empezo.
    Libera el slot de concurrencia (key) al terminar -- directo si el
    generador se agoto por su cuenta, o via _drain_remaining si se
    corto antes con trabajo pendiente (ver ahi el porque).
    """
    it = iter(sync_gen)
    start = time.monotonic()
    exhausted = False
    try:
        while True:
            if await request.is_disconnected():
                return
            remaining = timeout_seconds - (time.monotonic() - start)
            if remaining <= 0:
                yield {"stage": "error", "message": "La imagen tardo demasiado en procesarse. Prueba con una imagen mas simple."}
                return
            try:
                item = await asyncio.wait_for(asyncio.to_thread(_advance, it), timeout=remaining)
            except asyncio.TimeoutError:
                yield {"stage": "error", "message": "La imagen tardo demasiado en procesarse. Prueba con una imagen mas simple."}
                return
            if item is _STREAM_DONE:
                exhausted = True
                return
            yield item
    finally:
        if exhausted:
            vectorize_concurrency.release(key)
        else:
            asyncio.create_task(_drain_remaining(it, key))


def _format_sse(stage: VectorizeStage) -> str:
    # las etapas intermedias solo yieldan la imagen para que el pipeline
    # siga procesando sobre esos bytes (ver run_vectorize_stages) -- el
    # cliente solo necesita saber el NOMBRE de la etapa para su barra de
    # progreso, no la imagen en si, asi que no vale la pena pagar el
    # costo de codificarla a base64 y mandar decenas de KB por evento.
    if "svg" in stage:
        payload = {"stage": stage["stage"], "svg": stage["svg"], "bgHex": stage.get("bg_hex")}
    elif "message" in stage:
        payload = {"stage": stage["stage"], "message": stage["message"]}
    else:
        payload = {"stage": stage["stage"]}
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

    key = client_key(request)
    vectorize_concurrency.acquire(key)
    try:
        label = f"POST /api/vectorize ({len(source_bytes) // 1024}KB, remove_bg={remove_bg}, auto_colors={auto_colors})"
        with log_duration(label):
            svg_content, bg_hex = await with_timeout(
                asyncio.to_thread(run_vectorize, source_bytes, suffix, remove_bg, colors, auto_colors, params)
            )
        headers = {"X-Bg-Color": bg_hex} if bg_hex else {}
        return Response(content=svg_content, media_type="image/svg+xml", headers=headers)
    finally:
        vectorize_concurrency.release(key)


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

    key = client_key(request)
    vectorize_concurrency.acquire(key)

    async def event_stream():
        gen = run_vectorize_stages(source_bytes, suffix, remove_bg, colors, auto_colors, params)
        async for stage in _stream_stages(gen, PROCESSING_TIMEOUT_SECONDS, request, key):
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
