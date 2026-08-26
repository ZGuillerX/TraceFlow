from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Agrega un set minimo de headers de seguridad HTTP a toda
    respuesta. Sin CSP/HSTS a proposito: necesitan ajustarse al dominio
    real de despliegue (fuentes/scripts permitidos, subdominios, etc.),
    algo que no se puede probar ni definir bien en este entorno -- se
    dejan fuera en vez de agregar una politica generica sin validar.
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
