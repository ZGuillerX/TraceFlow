import asyncio
import re
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from pipeline.flat_background import remove_flat_background
from pipeline.remove_background import remove_background
from pipeline.validation import validate_image
from pipeline.vectorize import detail_to_params, vectorize

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"

# El primer llamado a rembg carga el modelo BiRefNet (~90s en CPU) antes de
# procesar; despues queda cacheado en memoria y cada imagen tarda unos
# segundos. El timeout cubre ese arranque en frio.
PROCESSING_TIMEOUT_SECONDS = 180


def ensure_viewbox(svg: str) -> str:
    """vtracer no incluye viewBox en el <svg> raiz, solo width/height fijos
    en px. Sin viewBox, forzar width/height:100% por CSS en el frontend no
    escala el dibujo (se ve cortado o minusculo) en vez de encajarlo
    proporcionalmente en el contenedor."""
    if "viewBox" in svg:
        return svg
    match = re.search(r'<svg\b[^>]*\bwidth="([\d.]+)"[^>]*\bheight="([\d.]+)"', svg)
    if not match:
        return svg
    w, h = match.group(1), match.group(2)
    return re.sub(r"<svg\b", f'<svg viewBox="0 0 {w} {h}"', svg, count=1)


def run_vectorize(source_bytes: bytes, suffix: str, remove_bg: bool, params: dict) -> str:
    """Trabajo sincrono (bloqueante) que corre en un hilo aparte via
    asyncio.to_thread, para no congelar el event loop de FastAPI mientras
    vtracer/rembg procesan la imagen."""
    if remove_bg:
        source_bytes = remove_flat_background(source_bytes)
        suffix = ".png"

    with tempfile.TemporaryDirectory(prefix="traceflow_") as tmp:
        in_path = Path(tmp) / f"input{suffix}"
        out_path = Path(tmp) / "output.svg"

        in_path.write_bytes(source_bytes)
        vectorize(str(in_path), str(out_path), **params)

        return ensure_viewbox(out_path.read_text(encoding="utf-8"))


async def with_timeout(coro):
    try:
        return await asyncio.wait_for(coro, timeout=PROCESSING_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        raise HTTPException(504, "La imagen tardo demasiado en procesarse. Prueba con una imagen mas simple.")


app = FastAPI(title="TraceFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/vectorize")
async def api_vectorize(
    file: UploadFile = File(...),
    detail: float = Form(72),
    colors: int = Form(8),
    remove_bg: bool = Form(False),
):
    source_bytes = await file.read()
    error = validate_image(file.content_type, source_bytes)
    if error:
        raise HTTPException(400, error)

    params = detail_to_params(detail, colors)
    suffix = Path(file.filename or "input.png").suffix or ".png"

    svg_content = await with_timeout(
        asyncio.to_thread(run_vectorize, source_bytes, suffix, remove_bg, params)
    )
    return Response(content=svg_content, media_type="image/svg+xml")


@app.post("/api/remove-background")
async def api_remove_background(file: UploadFile = File(...)):
    source_bytes = await file.read()
    error = validate_image(file.content_type, source_bytes)
    if error:
        raise HTTPException(400, error)

    png_bytes = await with_timeout(asyncio.to_thread(remove_background, source_bytes))
    return Response(content=png_bytes, media_type="image/png")


if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")
