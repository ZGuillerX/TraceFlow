"""Capa de servicio para quitar fondo con IA -- mismo rol que
vectorize_service.py para el pipeline de vectorizado: el router solo
llama a esta funcion, sin importar pipeline.* directo. Hoy es un
wrapper delgado; es el lugar natural para agregar validaciones propias
de este flujo (p. ej. limites especificos del modelo) sin ensuciar el
router."""

from pipeline.remove_background import Quality
from pipeline.remove_background import remove_background as _remove_background

__all__ = ["Quality", "remove_background"]


def remove_background(image_bytes: bytes, quality: Quality) -> bytes:
    return _remove_background(image_bytes, quality)
