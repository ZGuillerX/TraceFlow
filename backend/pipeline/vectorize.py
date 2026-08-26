from typing import Literal

import vtracer

ColorMode = Literal["color", "binary"]
Hierarchical = Literal["stacked", "cutout"]
CurveMode = Literal["spline", "polygon", "none"]


def vectorize(
    image_path: str,
    output_path: str,
    colormode: ColorMode = "color",
    hierarchical: Hierarchical = "stacked",
    mode: CurveMode = "spline",
    filter_speckle: int = 4,
    color_precision: int = 6,
    layer_difference: int = 16,
    corner_threshold: int = 60,
    length_threshold: float = 4.0,
    max_iterations: int = 10,
    splice_threshold: int = 45,
    path_precision: int = 8,
) -> str:
    vtracer.convert_image_to_svg_py(
        image_path,
        output_path,
        colormode=colormode,
        hierarchical=hierarchical,
        mode=mode,
        filter_speckle=filter_speckle,
        color_precision=color_precision,
        layer_difference=layer_difference,
        corner_threshold=corner_threshold,
        length_threshold=length_threshold,
        max_iterations=max_iterations,
        splice_threshold=splice_threshold,
        path_precision=path_precision,
    )
    return output_path


def detail_to_params(
    detail_pct: float,
    color_groups: int,
    curve_smoothing_pct: float | None = None,
    color_threshold_pct: float | None = None,
) -> dict:
    """Traduce los controles expuestos en la UI a los parametros reales de
    vtracer. Nivel de detalle (10-100) y Grupos de color (2-16) siempre se
    aplican; Suavizado de curvas y Umbral de colores son opcionales (modo
    "auto" en la UI = None) -- si no se dan, quedan en el default de vtracer
    que ya se probo y funciona bien para el caso general."""
    detail = max(10, min(100, detail_pct)) / 100.0
    params = {
        "color_precision": max(1, min(8, round(color_groups / 2))),
        # tope bajo a proposito: en iconos pequenos, detalles internos
        # (huecos, acentos) pueden ser de solo unos pocos pixeles, y un
        # filter_speckle alto los descarta como si fueran ruido
        "filter_speckle": round((1 - detail) * 6),
        "path_precision": max(1, min(10, round(2 + detail * 8))),
        "length_threshold": round(4 + (1 - detail) * 4, 1),
    }
    if curve_smoothing_pct is None:
        # fijo en el default de vtracer: acoplarlo al slider de detalle
        # bajaba el umbral al subir el detalle, y con menos umbral mas
        # puntos se tratan como esquina dura en vez de curva suave (se
        # veia facetado) -- como control propio e independiente (en vez
        # de derivado de "detalle") no tiene ese problema.
        params["corner_threshold"] = 60
    else:
        smoothing = max(0, min(100, curve_smoothing_pct)) / 100.0
        # 0% = esquinas duras (facetado), 100% = curvas muy redondeadas
        params["corner_threshold"] = round(20 + smoothing * 80)
    if color_threshold_pct is not None:
        threshold = max(0, min(100, color_threshold_pct)) / 100.0
        # layer_difference: cuanta diferencia de color hace falta para que
        # vtracer separe dos regiones en capas distintas. Medido con
        # colores reales: el rango donde realmente pasa algo es ~50-70,
        # no 0-48 como se penso al principio -- por debajo de 50 no
        # fusiona nada, por encima de 70 ya no hay mas que fusionar.
        params["layer_difference"] = max(1, round(threshold * 100))
    return params
