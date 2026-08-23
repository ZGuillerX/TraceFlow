import colorsys
import io

import numpy as np
from PIL import Image, ImageFilter
from scipy.spatial import cKDTree


def _same_color_family(
    c1: np.ndarray, c2: np.ndarray, hue_tolerance: float = 0.01, achromatic_sat: float = 0.15
) -> bool:
    """Compara dos colores por matiz en vez de por distancia RGB cruda.

    Un degradado/sombra propio del dibujo (mismo matiz, distinto brillo)
    no deberia contar como un color nuevo, pero un color realmente
    distinto (otro matiz) si. Los colores casi sin saturacion (grises,
    negro de un contorno, blanco) se comparan por luminosidad en vez de
    matiz, porque ahi el matiz es ruido sin significado visual.
    """
    h1, l1, s1 = colorsys.rgb_to_hls(*(c1 / 255.0))
    h2, l2, s2 = colorsys.rgb_to_hls(*(c2 / 255.0))
    if s1 < achromatic_sat and s2 < achromatic_sat:
        return abs(l1 - l2) < 0.25
    if s1 < achromatic_sat or s2 < achromatic_sat:
        return False
    hue_dist = min(abs(h1 - h2), 1 - abs(h1 - h2))
    return hue_dist < hue_tolerance


def detect_color_count(image_bytes: bytes, bg_color, bg_tolerance: int = 60, max_colors: int = 20) -> int:
    """Sugiere un num_colors para quantize_colors analizando la imagen,
    en vez de que el usuario tenga que adivinarlo con el slider.

    Cuantiza el area que no es fondo con un presupuesto generoso (hasta
    max_colors clusters) y luego fusiona los clusters que son la misma
    familia de color (ver _same_color_family), contando solo los grupos
    que sobreviven separados. Un umbral de poblacion no sirve aqui:
    MEDIANCUT reparte poblacion pareja entre bins aunque todos sean el
    mismo color, asi que casi todos "pasarian" un filtro por tamano.

    bg_color=None: la imagen ya viene recortada (transparencia real de
    origen, sin un color de fondo plano que tratar de forma especial) —
    se analizan todos los pixeles opacos por igual.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    arr = np.array(img)
    rgb = arr[:, :, :3].astype(int)
    alpha = arr[:, :, 3]
    opaque = alpha > 0

    if bg_color is None:
        remaining = opaque
    else:
        bg = np.array(bg_color)
        dist_to_bg = np.abs(rgb - bg).sum(axis=2)
        remaining = opaque & (dist_to_bg > bg_tolerance)

    rest_colors = rgb[remaining]
    if len(rest_colors) == 0:
        return 2

    budget = min(max_colors, len(rest_colors))
    n = len(rest_colors)
    swatch = Image.fromarray(rest_colors.reshape(1, n, 3).astype(np.uint8), "RGB")
    swatch_palette = swatch.quantize(colors=budget, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)

    full_rgb_img = Image.fromarray(rgb.astype(np.uint8), "RGB")
    quantized = full_rgb_img.quantize(colors=budget, palette=swatch_palette, dither=Image.Dither.NONE).convert("RGB")
    quantized_rest = np.array(quantized)[remaining]

    unique, _ = np.unique(quantized_rest.reshape(-1, 3), axis=0, return_counts=True)

    # clustering por componentes conexos (union-find), no por distancia a
    # un solo representante: un degradado fino encadena muchos pasos
    # chicos y puede recorrer un rango total amplio de matiz, pero cada
    # paso individual es parecido a su vecino. Comparar cada color solo
    # contra el primer representante de cada grupo fallaba con
    # degradados asi (los extremos del rango no se reconocian como
    # relacionados). Con componentes conexos, el degradado se une en un
    # solo grupo via la cadena de pasos intermedios, mientras que colores
    # realmente distintos (sin pasos intermedios que los conecten) quedan
    # separados.
    parent = list(range(len(unique)))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(len(unique)):
        for j in range(i + 1, len(unique)):
            if _same_color_family(unique[i], unique[j]):
                ri, rj = find(i), find(j)
                if ri != rj:
                    parent[ri] = rj

    groups = len({find(i) for i in range(len(unique))})
    # x3 en vez de +1: quantize_colors necesita margen extra por cada
    # familia de color para separar bien el tono "puro" del pixel de
    # borde/antialiasing mezclado con el vecino -- con el presupuesto
    # justo (un cluster por familia detectada) el color de salida sale
    # contaminado/lavado en vez de limpio (verificado con la franja del
    # cono: con budget=4 salia gris lavado, desde budget=6 sale el azul
    # real).
    return max(2, min(max_colors, groups * 3))


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

    bg_color=None: la imagen ya viene recortada (transparencia real de
    origen) y no hay un color de fondo que tratar de forma especial --
    tratar cualquier color oscuro real del dibujo como si fuera fondo
    lo borraria/contaminaria por error. Todos los pixeles opacos se
    cuantizan juntos, sin la separacion near_bg.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    arr = np.array(img)
    rgb = arr[:, :, :3].astype(int)
    alpha = arr[:, :, 3]
    opaque = alpha > 0

    out_rgb = rgb.copy()
    if bg_color is None:
        remaining = opaque
    else:
        bg = np.array(bg_color)
        dist_to_bg = np.abs(rgb - bg).sum(axis=2)
        near_bg = opaque & (dist_to_bg <= bg_tolerance)
        remaining = opaque & ~near_bg
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


def smooth_flat_edges(image_bytes: bytes, radius: float = 2) -> bytes:
    """Suaviza el borde en "escalera" de pixeles entre regiones de color
    ya planas, sin agregar tonos nuevos: cada pixel del resultado sigue
    siendo uno de los colores que ya estaban en la imagen.

    vtracer sigue el borde real pixel a pixel, y con una escalera dura
    necesita muchos segmentos de curva cortos para trazarla, lo que se
    ve como zigzag/mordido en vez de una curva continua. Difuminar y
    luego volver cada pixel al color plano mas cercano corrige la
    posicion del borde a nivel subpixel sin tocar la paleta.

    Solo para usar en imagenes sin transparencia real (con fondo
    solido): si hay huecos (alfa parcial) esto puede correr el borde
    de la zona opaca, por eso se separa de quantize_colors.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    arr = np.array(img)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]

    palette = np.unique(rgb[alpha > 0].reshape(-1, 3), axis=0)
    if len(palette) < 2:
        return image_bytes

    blurred = np.array(Image.fromarray(rgb).filter(ImageFilter.GaussianBlur(radius=radius)))
    tree = cKDTree(palette)
    _, nearest = tree.query(blurred.reshape(-1, 3))
    smoothed_rgb = palette[nearest].reshape(rgb.shape).astype(np.uint8)

    out = np.dstack([smoothed_rgb, alpha]).astype(np.uint8)
    buf = io.BytesIO()
    Image.fromarray(out, "RGBA").save(buf, format="PNG")
    return buf.getvalue()
