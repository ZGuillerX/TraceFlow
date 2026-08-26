import json
from unittest.mock import patch

from fastapi.testclient import TestClient

import main

client = TestClient(main.app, raise_server_exceptions=False)


def test_vectorize_imagen_valida(synthetic_png_bytes):
    resp = client.post(
        "/api/vectorize",
        files={"file": ("test.png", synthetic_png_bytes, "image/png")},
        data={"detail": 72, "colors": 8},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("image/svg+xml")
    assert "<svg" in resp.text


def test_vectorize_remove_bg_true_no_manda_bg_color(synthetic_png_bytes):
    resp = client.post(
        "/api/vectorize",
        files={"file": ("test.png", synthetic_png_bytes, "image/png")},
        data={"detail": 72, "colors": 8, "remove_bg": True},
    )
    assert resp.status_code == 200
    assert "x-bg-color" not in resp.headers


def test_vectorize_remove_bg_false_manda_bg_color_hex(synthetic_png_bytes):
    resp = client.post(
        "/api/vectorize",
        files={"file": ("test.png", synthetic_png_bytes, "image/png")},
        data={"detail": 72, "colors": 8, "remove_bg": False},
    )
    assert resp.status_code == 200
    bg = resp.headers.get("x-bg-color")
    assert bg is not None
    assert len(bg) == 6
    int(bg, 16)


def test_vectorize_archivo_invalido():
    resp = client.post(
        "/api/vectorize",
        files={"file": ("bad.txt", b"no es una imagen", "image/gif")},
        data={"detail": 72, "colors": 8},
    )
    assert resp.status_code == 400
    assert "detail" in resp.json()


def test_vectorize_stream_ultimo_evento_es_final(synthetic_png_bytes):
    resp = client.post(
        "/api/vectorize/stream",
        files={"file": ("test.png", synthetic_png_bytes, "image/png")},
        data={"detail": 72, "colors": 8},
    )
    assert resp.status_code == 200
    events = [json.loads(line[5:].strip()) for line in resp.text.strip().split("\n\n") if line.startswith("data:")]
    assert events[-1]["stage"] == "final"
    assert "<svg" in events[-1]["svg"]


def test_remove_background_mockeado(synthetic_png_bytes):
    # BiRefNet real tarda ~90s en frio y necesita descargar pesos --
    # este es el unico mock del suite, justificado por ser la frontera
    # exacta con un modelo de IA externo pesado, no logica propia.
    fake_png = b"\x89PNG\r\n\x1a\n" + b"contenido png falso"
    with patch("api.routers.remove_background.remove_background", return_value=fake_png):
        resp = client.post(
            "/api/remove-background",
            files={"file": ("test.png", synthetic_png_bytes, "image/png")},
            data={"quality": "fast"},
        )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("image/png")
    assert resp.content == fake_png
