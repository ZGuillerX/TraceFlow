from services.vectorize_service import (
    ensure_viewbox,
    run_vectorize,
    run_vectorize_stages,
)

DEFAULT_PARAMS = {
    "color_precision": 4,
    "filter_speckle": 4,
    "path_precision": 6,
    "length_threshold": 4.0,
    "corner_threshold": 60,
}


def _collect_stages(source_bytes: bytes, remove_bg: bool, colors: int = 8, auto_colors: bool = True):
    stages = []
    final = None
    for stage in run_vectorize_stages(source_bytes, ".png", remove_bg, colors, auto_colors, dict(DEFAULT_PARAMS)):
        stages.append(stage["stage"])
        if stage["stage"] == "final":
            final = stage
    return stages, final


def test_contrato_etapas_sin_quitar_fondo(synthetic_png_bytes):
    """Nombres y orden exactos de las etapas SSE -- el frontend
    (PreviewCanvas.tsx, STAGE_LABELS/STAGE_PROGRESS) depende de estos
    nombres literales para la barra de progreso. Si cambian sin querer
    aca, ningun chequeo de TypeScript lo detecta -- solo este test."""
    stages, final = _collect_stages(synthetic_png_bytes, remove_bg=False)
    assert stages == ["original", "ampliada", "colores", "bordes_suaves", "final"]
    assert final is not None
    assert "<svg" in final["svg"]
    assert final["bg_hex"] is not None


def test_contrato_etapas_quitando_fondo(synthetic_png_bytes):
    stages, final = _collect_stages(synthetic_png_bytes, remove_bg=True)
    assert stages == ["original", "ampliada", "sin_fondo", "colores", "final"]
    assert final is not None
    assert "<svg" in final["svg"]
    assert final["bg_hex"] is None


def test_run_vectorize_devuelve_lo_mismo_que_la_etapa_final(synthetic_png_bytes):
    svg, bg_hex = run_vectorize(synthetic_png_bytes, ".png", False, 8, True, dict(DEFAULT_PARAMS))
    _, final = _collect_stages(synthetic_png_bytes, remove_bg=False)
    assert svg == final["svg"]
    assert bg_hex == final["bg_hex"]


def test_ensure_viewbox_inyecta_cuando_falta():
    svg = '<svg width="100" height="50"><rect/></svg>'
    assert 'viewBox="0 0 100 50"' in ensure_viewbox(svg)


def test_ensure_viewbox_no_toca_si_ya_existe():
    svg = '<svg viewBox="0 0 10 10" width="100" height="50"></svg>'
    assert ensure_viewbox(svg) == svg
