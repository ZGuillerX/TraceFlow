import io

import numpy as np
from PIL import Image
from scipy import ndimage


def remove_flat_background(image_bytes: bytes, tolerance: int = 30) -> bytes:
    """Quita el fondo de color plano de un logo/icono.

    A diferencia de un modelo de segmentacion de fotos (pensado para
    aislar un sujeto de una escena), aqui el fondo suele llenar todo el
    cuadro (p. ej. un cuadrado navy detras de un icono), asi que no hay
    "sujeto" que detectar. En vez de eso: se toma el color de la esquina
    superior izquierda como color de fondo y se hace transparente solo
    la region de ese color que esta conectada al borde de la imagen
    (para no perforar detalles internos del dibujo que compartan tono).
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    arr = np.array(img)
    rgb = arr[:, :, :3].astype(int)

    bg_color = rgb[0, 0]
    diff = np.abs(rgb - bg_color).sum(axis=2)
    candidate = diff <= tolerance

    labeled, _ = ndimage.label(candidate)
    border_labels = set(labeled[0, :]) | set(labeled[-1, :]) | set(labeled[:, 0]) | set(labeled[:, -1])
    border_labels.discard(0)

    if border_labels:
        arr[np.isin(labeled, list(border_labels)), 3] = 0

    buf = io.BytesIO()
    Image.fromarray(arr, "RGBA").save(buf, format="PNG")
    return buf.getvalue()
