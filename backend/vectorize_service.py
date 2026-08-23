import io
import re
import tempfile
from pathlib import Path

from PIL import Image

from pipeline.flat_background import (
    binarize_alpha,
    has_existing_transparency,
    remove_flat_background,
)
from pipeline.quantize import detect_color_count, quantize_colors, smooth_flat_edges
from pipeline.upscale import upscale_if_small
from pipeline.vectorize import vectorize


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


def run_vectorize(
    source_bytes: bytes, suffix: str, remove_bg: bool, colors: int, auto_colors: bool, params: dict
) -> tuple[str, str | None]:
    """Trabajo sincrono (bloqueante) que corre en un hilo aparte via
    asyncio.to_thread, para no congelar el event loop de FastAPI mientras
    vtracer/rembg procesan la imagen. Devuelve (svg, bg_hex) — bg_hex es
    el color de fondo visible (modo "con fondo") para que el frontend
    sepa que color NO tocar si el usuario recolorea el trazo."""
    bg_hex = None
    if remove_bg:
        # imagenes chicas (iconos/capturas de pocos px) no traen suficiente
        # informacion para que vtracer dibuje curvas suaves en detalles
        # pequenos; un simple resize no ayuda (ya se probo), hace falta un
        # modelo de super-resolucion que reconstruya detalle plausible.
        source_bytes, scale = upscale_if_small(source_bytes)

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
            source_bytes, bg_color = remove_flat_background(source_bytes)
        # si la imagen ya traia transparencia parcial de origen (p. ej.
        # viene de la herramienta de quitar fondo con IA, con un borde
        # degradado en vez de un corte binario), vtracer traza cada nivel
        # de alfa como su propia region: se ve como un garabato oscuro
        # alrededor del dibujo en vez de un borde limpio.
        source_bytes = binarize_alpha(source_bytes)
        # el degradado/antialiasing del dibujo deja cientos de tonos casi
        # iguales; sin esto vtracer traza cada uno como su propia mancha.
        # Aqui se reduce a un puñado de colores planos antes de vectorizar.
        if auto_colors:
            num_colors = detect_color_count(source_bytes, bg_color)
        else:
            # tope en 20 (antes 8): con el slider al maximo alcanza para
            # iconos con varios colores reales distintos, no solo 1-2
            num_colors = max(2, min(20, round(colors * 0.4)))
        source_bytes = quantize_colors(source_bytes, num_colors, bg_color)
        # con la imagen ya reducida a colores planos, un color_precision
        # alto hace que vtracer re-fragmente el degradado en vez de
        # respetar los colores ya limpios (mas notorio mientras mas grande
        # la imagen). Pero con pocos colores (3) no alcanza a distinguir
        # ~20 colores reales y los vuelve a fusionar en casi 1 solo color
        # (verificado: con muchos colores, 3 colapsa a ~125 fills, 4 da
        # ~2000 fills bien separados) -- por eso escala con num_colors en
        # vez de quedar fijo.
        params = {
            **params,
            "color_precision": 3 if num_colors <= 4 else 4,
            "filter_speckle": max(1, params["filter_speckle"]) * scale,
        }
        suffix = ".png"
    else:
        # mismo tratamiento que arriba (mas resolucion + colores planos)
        # pero conservando el fondo en vez de quitarlo. bg_color se
        # detecta ANTES de agrandar (mas confiable ahi) y se le pasa al
        # upscaler para que restaure el fondo real si el modelo inventa
        # manchas de color en el borde.
        original_bg = tuple(int(c) for c in Image.open(io.BytesIO(source_bytes)).convert("RGBA").getpixel((0, 0))[:3])
        bg_hex = "{:02X}{:02X}{:02X}".format(*original_bg)
        source_bytes, scale = upscale_if_small(source_bytes, original_bg)
        if auto_colors:
            num_colors = detect_color_count(source_bytes, original_bg)
        else:
            # tope en 20 (antes 8): con el slider al maximo alcanza para
            # iconos con varios colores reales distintos, no solo 1-2
            num_colors = max(2, min(20, round(colors * 0.4)))
        source_bytes = quantize_colors(source_bytes, num_colors, original_bg)
        # sin transparencia de por medio (todo opaco, con fondo), es
        # seguro suavizar el borde en escalera entre regiones de color
        source_bytes = smooth_flat_edges(source_bytes)
        params = {
            **params,
            # ver comentario equivalente en la rama remove_bg: con muchos
            # colores reales, un color_precision fijo en 3 los vuelve a
            # fusionar en casi 1 solo color en vez de respetarlos.
            "color_precision": 3 if num_colors <= 4 else 4,
            "filter_speckle": max(1, params["filter_speckle"]) * scale,
            "length_threshold": 8.0,
            "splice_threshold": 90,
        }
        suffix = ".png"

    with tempfile.TemporaryDirectory(prefix="traceflow_") as tmp:
        in_path = Path(tmp) / f"input{suffix}"
        out_path = Path(tmp) / "output.svg"

        in_path.write_bytes(source_bytes)
        vectorize(str(in_path), str(out_path), **params)

        svg = out_path.read_text(encoding="utf-8")
        return ensure_viewbox(svg), bg_hex
