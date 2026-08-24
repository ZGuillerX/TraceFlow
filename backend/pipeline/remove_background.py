import os
from functools import lru_cache

import onnxruntime as ort
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
        # sin esto, onnxruntime elige su propio numero de hilos (no
        # siempre coincide con todos los cores disponibles) -- fijarlo
        # explicito a os.cpu_count() midio ~9% mas rapido en la
        # inferencia (14.0s -> 12.8s promedio, mismo resultado).
        sess_opts = ort.SessionOptions()
        sess_opts.intra_op_num_threads = os.cpu_count() or 1
        return new_session(MODEL_NAME, sess_opts=sess_opts)


def remove_background(image_bytes: bytes) -> bytes:
    session = get_session()
    with log_duration("quitar fondo con IA (inferencia)"):
        return remove(image_bytes, session=session)
