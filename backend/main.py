import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from pipeline.vectorize import detail_to_params, vectorize

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"

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
):
    if file.content_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(400, "Formato no soportado. Usa PNG, JPG o WEBP.")

    params = detail_to_params(detail, colors)

    with tempfile.TemporaryDirectory(prefix="traceflow_") as tmp:
        suffix = Path(file.filename or "input.png").suffix or ".png"
        in_path = Path(tmp) / f"input{suffix}"
        out_path = Path(tmp) / "output.svg"

        in_path.write_bytes(await file.read())
        vectorize(str(in_path), str(out_path), **params)

        svg_content = out_path.read_text(encoding="utf-8")

    return Response(content=svg_content, media_type="image/svg+xml")


if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")
