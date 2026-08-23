"""Configuracion de la app: valores que alguien podria querer ajustar
al desplegar (timeouts, limites, origenes permitidos). Los parametros
de ajuste fino de cada algoritmo (tolerancias de color, umbrales de
matiz, etc.) NO viven aqui a proposito -- se quedan junto a la logica
que ajustan, con su comentario explicando por que se eligio ese valor
especifico; centralizarlos aca los sacaria de ese contexto.
"""

# Origenes permitidos para llamar a la API (CORS). En produccion, agregar
# aqui el dominio real desde donde se sirva el frontend.
CORS_ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

# El primer llamado a rembg carga el modelo BiRefNet (~90s en CPU) antes de
# procesar; despues queda cacheado en memoria y cada imagen tarda unos
# segundos. El timeout cubre ese arranque en frio.
PROCESSING_TIMEOUT_SECONDS = 180

# Tamano maximo de archivo aceptado en /api/vectorize y /api/remove-background.
MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024

# Peticiones por IP permitidas por ventana en los endpoints pesados: sin
# esto, cualquiera puede mandar cientos de conversiones seguidas y
# disparar el costo de CPU/tiempo del servidor.
RATE_LIMIT_MAX_REQUESTS = 10
RATE_LIMIT_WINDOW_SECONDS = 60
