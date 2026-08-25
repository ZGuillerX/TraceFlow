import os
from functools import lru_cache
from typing import Literal

import onnxruntime as ort
from rembg import new_session, remove

from timing import log_duration

Quality = Literal["fast", "high"]

# "fast" (birefnet-general-lite) mide ~30-40% mas rapido, pero deja
# huecos de transparencia en detalles oscuros de alto contraste (ojos,
# sombras marcadas) que "high" no tiene -- ver ColorInput/SettingsPanel
# donde se expone la eleccion al usuario, igual que remove.bg.
MODEL_NAMES: dict[Quality, str] = {
    "fast": "birefnet-general-lite",
    "high": "birefnet-general",
}


@lru_cache(maxsize=len(MODEL_NAMES))
def get_session(quality: Quality):
    # cacheado con lru_cache (una entrada por calidad): la primera vez
    # que se usa CADA modelo tarda bastante (carga desde disco), luego
    # queda en memoria y esta llamada es instantanea.
    model_name = MODEL_NAMES[quality]
    with log_duration(f"cargar modelo {model_name} (arranque en frio)"):
        # sin esto, onnxruntime elige su propio numero de hilos (no
        # siempre coincide con todos los cores disponibles) -- fijarlo
        # explicito a os.cpu_count() midio ~9% mas rapido en la
        # inferencia (14.0s -> 12.8s promedio, mismo resultado).
        sess_opts = ort.SessionOptions()
        sess_opts.intra_op_num_threads = os.cpu_count() or 1
        return new_session(model_name, sess_opts=sess_opts)


def remove_background(image_bytes: bytes, quality: Quality = "high") -> bytes:
    session = get_session(quality)
    with log_duration(f"quitar fondo con IA ({quality})"):
        return remove(image_bytes, session=session)
