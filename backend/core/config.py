"""Configuracion de la app: valores que alguien podria querer ajustar
al desplegar (timeouts, limites, origenes permitidos). Los parametros
de ajuste fino de cada algoritmo (tolerancias de color, umbrales de
matiz, etc.) NO viven aqui a proposito -- se quedan junto a la logica
que ajustan, con su comentario explicando por que se eligio ese valor
especifico; centralizarlos aca los sacaria de ese contexto.
"""

import os

# Origenes permitidos para llamar a la API (CORS). Configurable con la
# variable de entorno TRACEFLOW_CORS_ORIGINS (lista separada por comas)
# para produccion; sin ella, cae al valor de desarrollo de siempre.
_env_origins = os.environ.get("TRACEFLOW_CORS_ORIGINS")
CORS_ALLOWED_ORIGINS = (
    [origin.strip() for origin in _env_origins.split(",") if origin.strip()]
    if _env_origins
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)

# El primer llamado a rembg carga el modelo BiRefNet (~90s en CPU) antes de
# procesar; despues queda cacheado en memoria y cada imagen tarda unos
# segundos. El timeout cubre ese arranque en frio.
PROCESSING_TIMEOUT_SECONDS = 180

# Tamano maximo de archivo aceptado en /api/vectorize y /api/remove-background.
MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024

# Resolucion maxima aceptada (ancho * alto). Un archivo puede pasar el
# limite de tamano en disco (arriba) y aun asi decodificar a una imagen
# enorme en memoria (PNG muy comprimido con dimensiones absurdas, tipo
# "decompression bomb") -- esto corta eso antes de que PIL/numpy/vtracer
# lleguen a procesarla. ~5000x5000px, muy por encima de cualquier uso real.
MAX_IMAGE_PIXELS = 25_000_000

# Peticiones por IP permitidas por ventana en los endpoints pesados: sin
# esto, cualquiera puede mandar cientos de conversiones seguidas y
# disparar el costo de CPU/tiempo del servidor.
RATE_LIMIT_MAX_REQUESTS = 10
RATE_LIMIT_WINDOW_SECONDS = 60

# Limite de rafaga corta para /api/vectorize y /api/vectorize/stream,
# ademas del limite de arriba: cancelar y volver a generar rapido (el
# boton "Cancelar" del frontend) no interrumpe de verdad el trabajo
# pesado ya lanzado (una vez arrancado, un hilo bloqueante no se puede
# matar desde afuera), asi que varias peticiones seguidas en pocos
# segundos siguen compitiendo por CPU aunque cada una individualmente
# este "cancelada". Esto limita cuantas puede lanzar el MISMO cliente
# en una ventana corta, sin importar si las anteriores siguen vivas.
VECTORIZE_BURST_MAX_REQUESTS = 3
VECTORIZE_BURST_WINDOW_SECONDS = 10
