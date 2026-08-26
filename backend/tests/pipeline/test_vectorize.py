from pipeline.vectorize import detail_to_params


def test_detail_bajo():
    params = detail_to_params(10, 8)
    detail = 0.10
    assert params["filter_speckle"] == round((1 - detail) * 6)
    assert params["path_precision"] == max(1, min(10, round(2 + detail * 8)))
    assert params["length_threshold"] == round(4 + (1 - detail) * 4, 1)


def test_detail_maximo():
    params = detail_to_params(100, 8)
    assert params["filter_speckle"] == 0
    assert params["path_precision"] == 10


def test_color_groups_clamped_arriba():
    params = detail_to_params(72, 100)
    assert params["color_precision"] == 8


def test_color_groups_clamped_abajo():
    params = detail_to_params(72, 0)
    assert params["color_precision"] == 1


def test_curve_smoothing_none_usa_default_fijo():
    params = detail_to_params(72, 8, curve_smoothing_pct=None)
    assert params["corner_threshold"] == 60


def test_curve_smoothing_extremos():
    assert detail_to_params(72, 8, curve_smoothing_pct=0)["corner_threshold"] == 20
    assert detail_to_params(72, 8, curve_smoothing_pct=100)["corner_threshold"] == 100


def test_color_threshold_none_no_agrega_layer_difference():
    params = detail_to_params(72, 8, color_threshold_pct=None)
    assert "layer_difference" not in params


def test_color_threshold_presente_agrega_layer_difference():
    params = detail_to_params(72, 8, color_threshold_pct=60)
    assert params["layer_difference"] == 60
