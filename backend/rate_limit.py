import random
import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request


class RateLimiter:
    """Limita cuantas peticiones acepta una misma IP en una ventana de
    tiempo (ventana deslizante, en memoria).

    Sin esto, cualquiera puede mandar cientos de peticiones pesadas
    seguidas (vectorizar, quitar fondo con IA) y disparar el costo de
    CPU/tiempo del servidor. No usa Redis a proposito: pensado para un
    despliegue de un solo proceso (ver la nota de optimizaciones de
    despliegue del proyecto), donde el estado en memoria alcanza.
    """

    def __init__(self, max_requests: int, window_seconds: float):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            cutoff = now - self.window_seconds
            while hits and hits[0] < cutoff:
                hits.pop(0)
            if len(hits) >= self.max_requests:
                retry_after = round(self.window_seconds - (now - hits[0]))
                raise HTTPException(
                    429,
                    f"Demasiadas peticiones. Espera {retry_after}s antes de intentar de nuevo.",
                    headers={"Retry-After": str(retry_after)},
                )
            hits.append(now)
        # limpieza oportunista: en un proceso de larga duracion, sin esto
        # cada IP que alguna vez pego quedaria en memoria para siempre
        if random.random() < 0.01:
            self._cleanup()

    def _cleanup(self, max_age_seconds: float = 3600) -> None:
        now = time.monotonic()
        with self._lock:
            stale = [k for k, hits in self._hits.items() if not hits or hits[-1] < now - max_age_seconds]
            for k in stale:
                del self._hits[k]


def client_key(request: Request) -> str:
    """IP real del cliente, respetando X-Forwarded-For si el servidor
    corre detras de un proxy inverso (nginx, Cloudflare, etc.) -- sin
    esto, todas las peticiones detras del mismo proxy compartirian una
    sola IP y se limitarian entre si por error."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
