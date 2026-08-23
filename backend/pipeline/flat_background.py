import io

import numpy as np
from PIL import Image
from scipy import ndimage


def remove_flat_background(image_bytes: bytes, tolerance: int = 90) -> tuple[bytes, tuple[int, int, int]]:
    """Quita el fondo de color plano de un logo/icono.

    A diferencia de un modelo de segmentacion de fotos (pensado para
    aislar un sujeto de una escena), aqui el fondo suele llenar todo el
    cuadro (p. ej. un cuadrado navy detras de un icono), asi que no hay
    "sujeto" que detectar. En vez de eso: se toma el color de la esquina
    superior izquierda como color de fondo y se hace transparente
    cualquier pixel de ese color, este o no pegado al borde — muchos
    iconos usan huecos internos del mismo color del fondo (asas, cortes)
    que tambien deben quedar transparentes, no rellenos.

    El tolerance es generoso a proposito: muchos iconos tienen un
    degradado/sombra suave en el fondo (no un color 100% plano).
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    arr = np.array(img)
    rgb = arr[:, :, :3].astype(int)

    bg_color = rgb[0, 0]
    diff = np.abs(rgb - bg_color).sum(axis=2)
    arr[diff <= tolerance, 3] = 0

    # a veces quedan motas sueltas, desconectadas de la figura principal
    # (halos del upscaler o artefactos de compresion); se descarta
    # cualquier region opaca chica que no este pegada al dibujo real
    opaque = arr[:, :, 3] > 0
    shape_labels, n_shapes = ndimage.label(opaque)
    if n_shapes > 1:
        sizes = ndimage.sum(opaque, shape_labels, range(1, n_shapes + 1))
        min_size = max(50, sizes.max() * 0.01)
        speck_labels = [i + 1 for i, s in enumerate(sizes) if s < min_size]
        if speck_labels:
            arr[np.isin(shape_labels, speck_labels), 3] = 0

    buf = io.BytesIO()
    Image.fromarray(arr, "RGBA").save(buf, format="PNG")
    return buf.getvalue(), tuple(int(c) for c in bg_color)
