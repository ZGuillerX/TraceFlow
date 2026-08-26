import pytest
from fastapi import HTTPException

from core.rate_limit import RateLimiter, client_key


class _FakeClient:
    def __init__(self, host):
        self.host = host


class _FakeRequest:
    def __init__(self, host=None, forwarded_for=None):
        self.client = _FakeClient(host) if host else None
        self.headers = {"x-forwarded-for": forwarded_for} if forwarded_for else {}


def test_permite_hasta_el_limite():
    limiter = RateLimiter(max_requests=3, window_seconds=60)
    for _ in range(3):
        limiter.check("cliente-a")


def test_bloquea_al_superar_el_limite():
    limiter = RateLimiter(max_requests=2, window_seconds=60)
    limiter.check("cliente-b")
    limiter.check("cliente-b")
    with pytest.raises(HTTPException) as exc_info:
        limiter.check("cliente-b")
    assert exc_info.value.status_code == 429


def test_reset_limpia_los_contadores():
    limiter = RateLimiter(max_requests=1, window_seconds=60)
    limiter.check("cliente-c")
    limiter.reset()
    limiter.check("cliente-c")


def test_clientes_distintos_no_se_afectan():
    limiter = RateLimiter(max_requests=1, window_seconds=60)
    limiter.check("cliente-d")
    limiter.check("cliente-e")


def test_client_key_usa_x_forwarded_for():
    req = _FakeRequest(forwarded_for="203.0.113.5, 10.0.0.1")
    assert client_key(req) == "203.0.113.5"


def test_client_key_cae_a_host_del_cliente():
    req = _FakeRequest(host="192.168.1.10")
    assert client_key(req) == "192.168.1.10"
