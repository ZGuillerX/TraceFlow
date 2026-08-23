import logging
import time
from contextlib import contextmanager

logger = logging.getLogger("traceflow")


@contextmanager
def log_duration(label: str):
    """Mide cuanto tarda el bloque y lo deja en el log (nivel INFO).

    Pensado para poder ver, peticion por peticion, POR QUE tardo lo
    que tardo -- si fue el modelo de IA cargando en frio (la primera
    vez tarda ~90s, despues queda en memoria y es casi instantaneo),
    una imagen grande, o algun paso puntual -- en vez de solo ver "la
    peticion tardo 47s" sin poder distinguir esos casos.

    Se usa como context manager en vez de decorador porque varios de
    los pasos que se miden son bloques de codigo (p. ej. la llamada a
    vtracer dentro de run_vectorize), no siempre funciones completas.
    """
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        logger.info("%s: %.2fs", label, elapsed)
