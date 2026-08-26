import io

import pytest
from PIL import Image, ImageDraw


def _make_png(
    size: tuple[int, int] = (220, 220),
    bg: tuple[int, int, int] = (255, 255, 255),
    fg: tuple[int, int, int] = (200, 30, 30),
) -> bytes:
    img = Image.new("RGB", size, bg)
    draw = ImageDraw.Draw(img)
    margin = size[0] // 5
    draw.rectangle([margin, margin, size[0] - margin, size[1] - margin], fill=fg)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def synthetic_png_bytes() -> bytes:
    """PNG sintetico de 220x220 (por encima de min_size=200 de
    upscale_if_small) con un fondo blanco y un cuadrado rojo -- da a
    quantize/vtracer algo real que procesar sin disparar el modelo de
    super-resolucion (lento, requiere descargar pesos)."""
    return _make_png()


@pytest.fixture
def synthetic_png_factory():
    """Version parametrizable de synthetic_png_bytes, para tests que
    necesitan un tamano/colores especificos."""
    return _make_png
