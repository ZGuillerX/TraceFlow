import io
from functools import lru_cache

import numpy as np
import torch
from PIL import Image

from timing import log_duration

MODEL_NAME = "eugenesiow/edsr-base"
MODEL_SCALE = 4
MAX_PASSES = 3


@lru_cache(maxsize=1)
def get_model():
    # cacheado con lru_cache: solo la primera vez descarga/carga el
    # modelo EDSR. El log de aca separa ese costo del de la inferencia
    # en si (_run_model), para saber si una peticion lenta fue por el
    # arranque en frio o por la imagen.
    with log_duration("cargar modelo EDSR (arranque en frio)"):
        from super_image import EdsrModel

        model = EdsrModel.from_pretrained(MODEL_NAME, scale=MODEL_SCALE)
        model.eval()
        return model


def _run_model(rgb: Image.Image) -> Image.Image:
    model = get_model()
    with log_duration("super-resolucion (inferencia, 1 pasada)"):
        tensor = torch.from_numpy(np.array(rgb)).permute(2, 0, 1).float().unsqueeze(0) / 255.0
        with torch.no_grad():
            out = model(tensor)
        out = out.squeeze(0).clamp(0, 1).permute(1, 2, 0).numpy()
        return Image.fromarray((out * 255).round().astype(np.uint8), "RGB")


def upscale_if_small(
    image_bytes: bytes, bg_color: tuple[int, int, int] | None = None, min_size: int = 200
) -> tuple[bytes, int]:
    """Si la imagen es chica, la agranda con un modelo de super-resolucion
    (no una simple interpolacion) antes de vectorizar.

    A diferencia de un resize con LANCZOS/nearest, que solo estira los
    pixeles que ya existen, este modelo fue entrenado para reconstruir
    detalle plausible que no esta explicito en la imagen de baja
    resolucion. Es lo unico que puede darle a vtracer suficiente
    informacion para trazar curvas suaves en detalles de pocos pixeles
    (un simple upscale sin IA no aporta datos nuevos, ya se probo).

    Si se pasa bg_color (detectado sobre la imagen original antes de
    agrandar): el modelo reconstruye peor los bordes de la imagen y a
    veces inventa manchas de color falsas justo ahi. Donde el original
    ya decia claramente "esto es fondo" se restaura ese color exacto
    despues de agrandar, sin confiar en lo que el modelo haya
    reconstruido ahi. Si no se pasa (None), no se toca nada — se
    mantiene el comportamiento original.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

    bg_mask = None
    if bg_color is not None:
        original_rgb = np.array(img)[:, :, :3].astype(int)
        bg_mask = np.abs(original_rgb - np.array(bg_color)).sum(axis=2) <= 90

    passes = 0
    while max(img.size) < min_size and passes < MAX_PASSES:
        r, g, b, a = img.split()
        rgb = Image.merge("RGB", (r, g, b))
        upscaled_rgb = _run_model(rgb)
        upscaled_alpha = a.resize(upscaled_rgb.size, Image.LANCZOS)
        img = Image.merge("RGBA", (*upscaled_rgb.split(), upscaled_alpha))
        passes += 1

    if bg_mask is not None and passes > 0:
        mask_img = Image.fromarray((bg_mask * 255).astype(np.uint8)).resize(img.size, Image.NEAREST)
        scaled_mask = np.array(mask_img) > 127
        arr = np.array(img)
        arr[scaled_mask, :3] = bg_color
        img = Image.fromarray(arr, "RGBA")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue(), MODEL_SCALE**passes
