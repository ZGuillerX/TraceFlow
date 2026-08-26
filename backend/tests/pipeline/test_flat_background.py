import io

import numpy as np
from PIL import Image

from pipeline.flat_background import (
    binarize_alpha,
    has_existing_transparency,
    remove_flat_background,
)


def _rgba_png(arr: np.ndarray) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(arr, "RGBA").save(buf, format="PNG")
    return buf.getvalue()


def test_has_existing_transparency_detecta_transparencia_real():
    arr = np.full((50, 50, 4), (10, 20, 30, 255), dtype=np.uint8)
    arr[:10, :10, 3] = 0  # 4% del area, por encima del umbral del 3%
    assert has_existing_transparency(_rgba_png(arr))


def test_has_existing_transparency_falso_si_es_opaca():
    arr = np.full((50, 50, 4), (10, 20, 30, 255), dtype=np.uint8)
    assert not has_existing_transparency(_rgba_png(arr))


def test_remove_flat_background_quita_esquina_preserva_interior():
    arr = np.full((60, 60, 4), (255, 255, 255, 255), dtype=np.uint8)
    arr[20:40, 20:40] = (10, 20, 30, 255)
    out, bg_color = remove_flat_background(_rgba_png(arr))
    assert bg_color == (255, 255, 255)
    result = np.array(Image.open(io.BytesIO(out)).convert("RGBA"))
    assert result[0, 0, 3] == 0
    assert tuple(result[30, 30]) == (10, 20, 30, 255)


def test_binarize_alpha_fuerza_binario():
    arr = np.full((10, 10, 4), (10, 20, 30, 128), dtype=np.uint8)
    out = binarize_alpha(_rgba_png(arr), threshold=128)
    result = np.array(Image.open(io.BytesIO(out)).convert("RGBA"))
    assert set(np.unique(result[:, :, 3]).tolist()) <= {0, 255}
