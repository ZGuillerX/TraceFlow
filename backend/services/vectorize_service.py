import io
import re
import tempfile
from pathlib import Path
from typing import Generator, Iterator, TypedDict

from PIL import Image

from core.timing import log_duration
from pipeline.flat_background import (
    binarize_alpha,
    has_existing_transparency,
    remove_flat_background,
)
from pipeline.quantize import detect_color_count, quantize_colors, smooth_flat_edges
from pipeline.upscale import upscale_if_small
from pipeline.vectorize import vectorize


class VectorizeStage(TypedDict, total=False):
    stage: str
    image: bytes
    svg: str
    bg_hex: str | None


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


def _extract_background_hex(source_bytes: bytes) -> tuple[tuple[int, int, int], str]:
    """Muestrea el pixel de la esquina (0,0) de la imagen original como
    color de fondo, ANTES de agrandarla (mas confiable ahi) -- se usa
    para restaurar ese color real si el upscaler inventa manchas en el
    borde, y para reportarle al frontend (bg_hex) que color NO tocar
    si el usuario recolorea el trazo."""
    original_bg = tuple(int(c) for c in Image.open(io.BytesIO(source_bytes)).convert("RGBA").getpixel((0, 0))[:3])
    bg_hex = "{:02X}{:02X}{:02X}".format(*original_bg)
    return original_bg, bg_hex


def _resolve_color_count(
    colors: int, auto_colors: bool, source_bytes: bytes, bg_color: tuple[int, int, int] | None
) -> int:
    if auto_colors:
        with log_duration("detectar colores"):
            return detect_color_count(source_bytes, bg_color)
    # tope en 20 (antes 8): con el slider al maximo alcanza para
    # iconos con varios colores reales distintos, no solo 1-2
    return max(2, min(20, round(colors * 0.4)))


def _quantize_and_yield(
    source_bytes: bytes,
    colors: int,
    auto_colors: bool,
    bg_color: tuple[int, int, int] | None,
    duration_label: str,
) -> Generator[VectorizeStage, None, tuple[bytes, int]]:
    """Resuelve la cantidad de colores (auto o manual), cuantiza y emite
    la etapa "colores" -- paso identico en ambas ramas de
    run_vectorize_stages, solo cambia el color de fondo que se le pasa."""
    num_colors = _resolve_color_count(colors, auto_colors, source_bytes, bg_color)
    with log_duration(duration_label):
        source_bytes = quantize_colors(source_bytes, num_colors, bg_color)
    yield {"stage": "colores", "image": source_bytes}
    return source_bytes, num_colors


def _merge_vtracer_params(params: dict, num_colors: int, scale: int, *, with_background: bool) -> dict:
    merged = {
        **params,
        # con la imagen ya reducida a colores planos, un color_precision
        # alto hace que vtracer re-fragmente el degradado en vez de
        # respetar los colores ya limpios (mas notorio mientras mas grande
        # la imagen). Pero con pocos colores (3) no alcanza a distinguir
        # ~20 colores reales y los vuelve a fusionar en casi 1 solo color
        # (verificado: con muchos colores, 3 colapsa a ~125 fills, 4 da
        # ~2000 fills bien separados) -- por eso escala con num_colors en
        # vez de quedar fijo.
        "color_precision": 3 if num_colors <= 4 else 4,
        "filter_speckle": max(1, params["filter_speckle"]) * scale,
    }
    if with_background:
        merged["length_threshold"] = 8.0
        merged["splice_threshold"] = 90
    return merged


def _process_removing_background(
    source_bytes: bytes, colors: int, auto_colors: bool, params: dict
) -> Generator[VectorizeStage, None, tuple[bytes, dict, str]]:
    """Rama remove_bg=True completa: agranda, quita el fondo (plano o ya
    transparente de origen), binariza el alfa, cuantiza y ajusta los
    parametros de vtracer. Devuelve (bytes listos para vectorizar,
    params mezclados, suffix)."""
    # imagenes chicas (iconos/capturas de pocos px) no traen suficiente
    # informacion para que vtracer dibuje curvas suaves en detalles
    # pequenos; un simple resize no ayuda (ya se probo), hace falta un
    # modelo de super-resolucion que reconstruya detalle plausible.
    with log_duration("upscale (sin fondo)"):
        source_bytes, scale = upscale_if_small(source_bytes)
    yield {"stage": "ampliada", "image": source_bytes}

    if has_existing_transparency(source_bytes):
        # la imagen ya viene recortada (transparencia real de origen,
        # p. ej. de una herramienta externa de quitar fondo).
        # remove_flat_background asume un fondo de color plano y
        # tomaria el pixel de la esquina transparente (tipicamente
        # RGB negro) como "color de fondo", borrando por error
        # cualquier color oscuro real del dibujo (ojos, contornos)
        # por parecerse a ese negro.
        bg_color = None
    else:
        with log_duration("quitar fondo plano"):
            source_bytes, bg_color = remove_flat_background(source_bytes)
    # si la imagen ya traia transparencia parcial de origen (p. ej.
    # viene de la herramienta de quitar fondo con IA, con un borde
    # degradado en vez de un corte binario), vtracer traza cada nivel
    # de alfa como su propia region: se ve como un garabato oscuro
    # alrededor del dibujo en vez de un borde limpio.
    source_bytes = binarize_alpha(source_bytes)
    yield {"stage": "sin_fondo", "image": source_bytes}

    # el degradado/antialiasing del dibujo deja cientos de tonos casi
    # iguales; sin esto vtracer traza cada uno como su propia mancha.
    # Aqui se reduce a un puñado de colores planos antes de vectorizar.
    source_bytes, num_colors = yield from _quantize_and_yield(
        source_bytes, colors, auto_colors, bg_color, "cuantizar colores (sin fondo)"
    )
    params = _merge_vtracer_params(params, num_colors, scale, with_background=False)
    return source_bytes, params, ".png"


def _process_keeping_background(
    source_bytes: bytes, colors: int, auto_colors: bool, params: dict
) -> Generator[VectorizeStage, None, tuple[bytes, dict, str, str]]:
    """Rama remove_bg=False completa: agranda conservando el fondo,
    cuantiza, suaviza los bordes en escalera entre regiones de color y
    ajusta los parametros de vtracer. Devuelve (bytes listos para
    vectorizar, params mezclados, suffix, bg_hex del fondo detectado)."""
    # bg_color se detecta ANTES de agrandar (mas confiable ahi) y se le
    # pasa al upscaler para que restaure el fondo real si el modelo
    # inventa manchas de color en el borde.
    original_bg, bg_hex = _extract_background_hex(source_bytes)
    with log_duration("upscale (con fondo)"):
        source_bytes, scale = upscale_if_small(source_bytes, original_bg)
    yield {"stage": "ampliada", "image": source_bytes}

    source_bytes, num_colors = yield from _quantize_and_yield(
        source_bytes, colors, auto_colors, original_bg, "cuantizar colores (con fondo)"
    )

    # sin transparencia de por medio (todo opaco, con fondo), es
    # seguro suavizar el borde en escalera entre regiones de color
    with log_duration("suavizar bordes"):
        source_bytes = smooth_flat_edges(source_bytes)
    yield {"stage": "bordes_suaves", "image": source_bytes}

    params = _merge_vtracer_params(params, num_colors, scale, with_background=True)
    return source_bytes, params, ".png", bg_hex


def _vectorize_and_yield_final(
    source_bytes: bytes, suffix: str, params: dict, bg_hex: str | None
) -> Iterator[VectorizeStage]:
    """Paso final comun a ambas ramas: escribe la imagen ya preparada a
    un archivo temporal, llama a vtracer y emite la etapa "final" con
    el SVG resultante."""
    with tempfile.TemporaryDirectory(prefix="traceflow_") as tmp:
        in_path = Path(tmp) / f"input{suffix}"
        out_path = Path(tmp) / "output.svg"

        in_path.write_bytes(source_bytes)
        with log_duration("vtracer"):
            vectorize(str(in_path), str(out_path), **params)

        svg = out_path.read_text(encoding="utf-8")
        yield {"stage": "final", "svg": ensure_viewbox(svg), "bg_hex": bg_hex}


def run_vectorize_stages(
    source_bytes: bytes, suffix: str, remove_bg: bool, colors: int, auto_colors: bool, params: dict
) -> Iterator[VectorizeStage]:
    """Version generador de run_vectorize: yield de una imagen PNG por
    cada etapa del pipeline segun se completa (para el preview en vivo
    del proceso), terminando con la etapa "final" que trae el SVG.

    Trabajo sincrono (bloqueante) -- pensado para consumirse desde un
    hilo aparte (ver _stream_stages en api/routers/vectorize.py), para
    no congelar el event loop de FastAPI mientras vtracer/rembg
    procesan la imagen.

    Orquestador delgado: cada rama (con/sin fondo) vive en su propia
    funcion generadora (_process_removing_background /
    _process_keeping_background), que reutilizan los mismos helpers de
    cuantizado y merge de parametros -- antes esa logica estaba casi
    duplicada entre ambas ramas dentro de esta misma funcion.
    """
    yield {"stage": "original", "image": source_bytes}

    if remove_bg:
        source_bytes, params, suffix = yield from _process_removing_background(
            source_bytes, colors, auto_colors, params
        )
        bg_hex = None
    else:
        source_bytes, params, suffix, bg_hex = yield from _process_keeping_background(
            source_bytes, colors, auto_colors, params
        )

    yield from _vectorize_and_yield_final(source_bytes, suffix, params, bg_hex)


def run_vectorize(
    source_bytes: bytes, suffix: str, remove_bg: bool, colors: int, auto_colors: bool, params: dict
) -> tuple[str, str | None]:
    """Wrapper sin streaming sobre run_vectorize_stages, para el endpoint
    /api/vectorize que solo necesita el resultado final. Corre en un
    hilo aparte via asyncio.to_thread. Devuelve (svg, bg_hex) — bg_hex
    es el color de fondo visible (modo "con fondo") para que el
    frontend sepa que color NO tocar si el usuario recolorea el trazo.
    """
    for stage in run_vectorize_stages(source_bytes, suffix, remove_bg, colors, auto_colors, params):
        if stage["stage"] == "final":
            return stage["svg"], stage.get("bg_hex")
    raise RuntimeError("run_vectorize_stages no genero una etapa final")
