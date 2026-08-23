import io
from functools import lru_cache

import numpy as np
import torch
from PIL import Image

MODEL_NAME = "eugenesiow/edsr-base"
MODEL_SCALE = 4
MAX_PASSES = 3


@lru_cache(maxsize=1)
def get_model():
    from super_image import EdsrModel

    model = EdsrModel.from_pretrained(MODEL_NAME, scale=MODEL_SCALE)
    model.eval()
    return model


def _run_model(rgb: Image.Image) -> Image.Image:
    model = get_model()
    tensor = torch.from_numpy(np.array(rgb)).permute(2, 0, 1).float().unsqueeze(0) / 255.0
    with torch.no_grad():
        out = model(tensor)
    out = out.squeeze(0).clamp(0, 1).permute(1, 2, 0).numpy()
    return Image.fromarray((out * 255).round().astype(np.uint8), "RGB")


def upscale_if_small(image_bytes: bytes, min_size: int = 200) -> tuple[bytes, int]:
    """Si la imagen es chica, la agranda con un modelo de super-resolucion
    (no una simple interpolacion) antes de vectorizar.

    A diferencia de un resize con LANCZOS/nearest, que solo estira los
    pixeles que ya existen, este modelo fue entrenado para reconstruir
    detalle plausible que no esta explicito en la imagen de baja
    resolucion. Es lo unico que puede darle a vtracer suficiente
    informacion para trazar curvas suaves en detalles de pocos pixeles
    (un simple upscale sin IA no aporta datos nuevos, ya se probo).
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

    passes = 0
    while max(img.size) < min_size and passes < MAX_PASSES:
        r, g, b, a = img.split()
        rgb = Image.merge("RGB", (r, g, b))
        upscaled_rgb = _run_model(rgb)
        upscaled_alpha = a.resize(upscaled_rgb.size, Image.LANCZOS)
        img = Image.merge("RGBA", (*upscaled_rgb.split(), upscaled_alpha))
        passes += 1

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue(), MODEL_SCALE**passes
