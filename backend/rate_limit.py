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
                    headers={"Retry-After": str(retry_after), "X-Limit-Type": "rate"},
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


class ConcurrencyLimiter:
    """Limita cuantas peticiones pesadas puede tener UNA MISMA IP "en
    vuelo" al mismo tiempo -- a diferencia de RateLimiter (que limita la
    TASA total en una ventana de tiempo), esto limita la CONCURRENCIA
    simultanea.

    Sin esto: cancelar del lado del cliente libera la UI al instante,
    pero un hilo ya lanzado con asyncio.to_thread no se puede
    interrumpir a medio trabajo (ver _stream_stages en routes.py) --
    asi que generar y cancelar rapido varias veces seguidas deja cada
    peticion anterior corriendo por su cuenta en el pool de hilos
    compartido, compitiendo con las nuevas. Confirmado en produccion:
    10 peticiones en 7s hicieron que una sola etapa pasara de 3s a 13s.
    """

    def __init__(self, max_concurrent: int = 1):
        self.max_concurrent = max_concurrent
        self._active: dict[str, int] = defaultdict(int)
        self._lock = Lock()

    def acquire(self, key: str) -> None:
        with self._lock:
            if self._active[key] >= self.max_concurrent:
                raise HTTPException(
                    429,
                    "Ya tienes una vectorizacion en curso. Espera a que termine o cancelala antes de generar otra.",
                    headers={"X-Limit-Type": "concurrency"},
                )
            self._active[key] += 1

    def release(self, key: str) -> None:
        with self._lock:
            self._active[key] -= 1
            if self._active[key] <= 0:
                del self._active[key]


def client_key(request: Request) -> str:
    """IP real del cliente, respetando X-Forwarded-For si el servidor
    corre detras de un proxy inverso (nginx, Cloudflare, etc.) -- sin
    esto, todas las peticiones detras del mismo proxy compartirian una
    sola IP y se limitarian entre si por error."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
