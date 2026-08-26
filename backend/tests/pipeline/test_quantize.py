import io

import numpy as np
from PIL import Image

from pipeline.quantize import detect_color_count, quantize_colors, smooth_flat_edges


def _make_two_tone_png(
    size: tuple[int, int] = (120, 120),
    bg: tuple[int, int, int] = (255, 255, 255),
    fg: tuple[int, int, int] = (200, 30, 30),
) -> bytes:
    arr = np.full((*size, 3), bg, dtype=np.uint8)
    margin = size[0] // 4
    arr[margin:-margin, margin:-margin] = fg
    buf = io.BytesIO()
    Image.fromarray(arr, "RGB").save(buf, format="PNG")
    return buf.getvalue()


def test_quantize_separa_el_fondo():
    data = _make_two_tone_png()
    out = quantize_colors(data, num_colors=3, bg_color=(255, 255, 255))
    arr = np.array(Image.open(io.BytesIO(out)).convert("RGBA"))
    assert tuple(arr[0, 0, :3]) == (255, 255, 255)


def test_quantize_sin_bg_color_cuantiza_todo_junto():
    data = _make_two_tone_png()
    out = quantize_colors(data, num_colors=3, bg_color=None)
    img = Image.open(io.BytesIO(out))
    assert img.size == (120, 120)


def test_detect_color_count_minimo_dos_sin_resto():
    img = Image.new("RGB", (50, 50), (255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    assert detect_color_count(buf.getvalue(), bg_color=(255, 255, 255)) == 2


def test_smooth_flat_edges_menos_de_dos_colores_no_cambia_nada():
    img = Image.new("RGB", (50, 50), (10, 20, 30))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data = buf.getvalue()
    assert smooth_flat_edges(data) == data
