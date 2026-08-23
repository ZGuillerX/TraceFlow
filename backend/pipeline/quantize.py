import io

import numpy as np
from PIL import Image


def quantize_colors(image_bytes: bytes, num_colors: int, bg_color, bg_tolerance: int = 60) -> bytes:
    """Reduce la imagen a un numero pequeno de colores planos, sin dejar
    que un fondo/degradado dominen el resultado.

    Un icono exportado casi nunca es 100% de color plano: el degradado
    o el antialiasing hacen que cada pixel del cuerpo tenga un tono
    ligeramente distinto (a veces cientos de tonos "unicos" en un icono
    de 60x60). vtracer traza cada tono distinto como su propia region,
    lo que se ve como manchas/facetas en vez de un dibujo limpio.

    Aqui se separan primero los pixeles que ya son del color de fondo
    conocido (bg_color, p. ej. detalles internos recortados del mismo
    tono que el fondo) y se fijan exactamente a ese color. El resto
    (el cuerpo del dibujo, con su posible degradado) se agrupa en
    max(1, num_colors - 1) bandas de color via cuantizacion de PIL,
    calculada solo sobre esos pixeles para que el fondo no le robe
    presupuesto de color a las bandas del dibujo.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    arr = np.array(img)
    rgb = arr[:, :, :3].astype(int)
    alpha = arr[:, :, 3]
    opaque = alpha > 0

    bg = np.array(bg_color)
    dist_to_bg = np.abs(rgb - bg).sum(axis=2)
    near_bg = opaque & (dist_to_bg <= bg_tolerance)
    remaining = opaque & ~near_bg

    out_rgb = rgb.copy()
    out_rgb[near_bg] = bg

    rest_colors = rgb[remaining]
    band_budget = max(1, num_colors - 1)
    if len(rest_colors) and band_budget > 0:
        n = len(rest_colors)
        side = int(np.ceil(np.sqrt(n)))
        padded = np.zeros((side * side, 3), dtype=np.uint8)
        padded[:n] = rest_colors.astype(np.uint8)
        swatch = Image.fromarray(padded.reshape(side, side, 3), "RGB")
        swatch_palette = swatch.quantize(
            colors=band_budget, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
        )

        full_rgb_img = Image.fromarray(rgb.astype(np.uint8), "RGB")
        full_quantized = full_rgb_img.quantize(
            colors=band_budget, palette=swatch_palette, dither=Image.Dither.NONE
        ).convert("RGB")
        out_rgb[remaining] = np.array(full_quantized)[remaining]

    out = np.dstack([out_rgb.astype(np.uint8), alpha]).astype(np.uint8)
    buf = io.BytesIO()
    Image.fromarray(out, "RGBA").save(buf, format="PNG")
    return buf.getvalue()
