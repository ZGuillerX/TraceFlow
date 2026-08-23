import io

import numpy as np
from PIL import Image
from scipy import ndimage


def has_existing_transparency(image_bytes: bytes, threshold: float = 0.03) -> bool:
    """Detecta si la imagen ya viene recortada (con transparencia real de
    origen) en vez de tener un fondo de color plano por quitar.

    remove_flat_background asume que el fondo es un color solido que
    llena el cuadro (p. ej. un cuadrado navy detras de un icono) y toma
    el pixel de la esquina como referencia de ese color. Si la imagen ya
    trae transparencia real (p. ej. viene de una herramienta externa de
    quitar fondo), esa esquina suele ser (0,0,0,0) -- RGB negro con
    alfa 0 -- y remove_flat_background terminaria tratando cualquier
    color oscuro real del dibujo (ojos, contornos) como si fuera fondo,
    borrandolo por error.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    alpha = np.array(img)[:, :, 3]
    return (alpha == 0).mean() > threshold


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


def binarize_alpha(image_bytes: bytes, threshold: int = 128) -> bytes:
    """Fuerza el canal alfa a binario (0 o 255).

    Si la imagen ya trae transparencia parcial de origen (p. ej. el
    resultado de una herramienta de quitar fondo con IA, con un
    degradado suave en el borde en vez de un corte binario), vtracer
    traza cada nivel de alfa como una region separada: decenas de
    anillos casi transparentes alrededor del dibujo se ven como un
    garabato oscuro en vez de un borde limpio.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    arr = np.array(img)
    arr[:, :, 3] = np.where(arr[:, :, 3] >= threshold, 255, 0)
    buf = io.BytesIO()
    Image.fromarray(arr, "RGBA").save(buf, format="PNG")
    return buf.getvalue()
