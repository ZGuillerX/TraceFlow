from functools import lru_cache

from rembg import new_session, remove

from timing import log_duration

MODEL_NAME = "birefnet-general"


@lru_cache(maxsize=1)
def get_session():
    # cacheado con lru_cache: esto tarda ~90s la primera vez (carga el
    # modelo BiRefNet), despues queda en memoria y esta llamada es
    # instantanea. El log de aca separa ese costo del de remove_background
    # en si, para saber si una peticion lenta fue por el arranque en frio
    # o por la imagen.
    with log_duration("cargar modelo BiRefNet (arranque en frio)"):
        return new_session(MODEL_NAME)


def remove_background(image_bytes: bytes) -> bytes:
    session = get_session()
    with log_duration("quitar fondo con IA (inferencia)"):
        return remove(image_bytes, session=session)
