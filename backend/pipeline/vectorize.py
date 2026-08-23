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


def detail_to_params(detail_pct: float, color_groups: int) -> dict:
    """Traduce los dos controles expuestos en la UI (Nivel de detalle 10-100,
    Grupos de color 2-16) a los parámetros reales de vtracer."""
    detail = max(10, min(100, detail_pct)) / 100.0
    return {
        "color_precision": max(1, min(8, round(color_groups / 2))),
        # tope bajo a proposito: en iconos pequenos, detalles internos
        # (huecos, acentos) pueden ser de solo unos pocos pixeles, y un
        # filter_speckle alto los descarta como si fueran ruido
        "filter_speckle": round((1 - detail) * 6),
        "path_precision": max(1, min(10, round(2 + detail * 8))),
        "corner_threshold": round(80 - detail * 40),
        "length_threshold": round(4 + (1 - detail) * 4, 1),
    }
