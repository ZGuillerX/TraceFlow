import asyncio

from fastapi import HTTPException

from core.config import PROCESSING_TIMEOUT_SECONDS


async def with_timeout(coro):
    """Envuelve una corrutina pesada (vectorizar, quitar fondo) con un
    limite de tiempo comun a ambos routers -- si se agota, responde 504
    en espanol en vez de dejar la conexion colgada indefinidamente."""
    try:
        return await asyncio.wait_for(coro, timeout=PROCESSING_TIMEOUT_SECONDS)
    except asyncio.TimeoutError as e:
        raise HTTPException(504, "La imagen tardo demasiado en procesarse. Prueba con una imagen mas simple.") from e
