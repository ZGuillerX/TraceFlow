import logging

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("traceflow")


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Ultima linea de defensa contra excepciones no anticipadas del
    pipeline (PIL, vtracer, rembg, numpy/scipy) que ningun endpoint
    captura explicitamente -- sin esto, un archivo que pasa la
    validacion pero falla mas adelante (p. ej. corrupto de una forma
    que PIL no detecta al abrir el header) termina en un 500 generico
    de Starlette, sin loguear nada y sin mensaje en espanol,
    inconsistente con el resto de la API.

    Los HTTPException ya definidos en los endpoints (400/429/504) los
    sigue manejando el handler propio de FastAPI, mas especifico, sin
    pasar por aca.
    """
    logger.exception("Error no controlado en %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Ocurrió un error al procesar la imagen. Intenta de nuevo."},
    )
