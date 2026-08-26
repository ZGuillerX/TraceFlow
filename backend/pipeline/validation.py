import io

from PIL import Image, UnidentifiedImageError

from core.config import MAX_IMAGE_PIXELS, MAX_UPLOAD_SIZE_BYTES

IMAGE_SIGNATURES = {
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/webp": [b"RIFF"],
}


def validate_image(content_type: str | None, data: bytes) -> str | None:
    """Valida tipo, tamano, contenido real del archivo (magic numbers),
    integridad y resolucion.

    Devuelve un mensaje de error en espanol si algo no cuadra, o None
    si el archivo es valido. Revisar los bytes reales (no solo el
    content_type que manda el navegador) evita que un archivo renombrado
    o corrupto llegue a vtracer/rembg y falle mas adelante con un error
    menos claro.
    """
    if content_type not in IMAGE_SIGNATURES:
        return "Formato no soportado. Usa PNG, JPG o WEBP."
    if len(data) > MAX_UPLOAD_SIZE_BYTES:
        return f"El archivo supera el limite de {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB."
    if not any(data.startswith(sig) for sig in IMAGE_SIGNATURES[content_type]):
        return "El contenido del archivo no coincide con el formato declarado."
    if content_type == "image/webp" and (len(data) < 12 or data[8:12] != b"WEBP"):
        return "El contenido del archivo no coincide con el formato declarado."

    # Image.open() solo lee el encabezado (barato, no decodifica pixeles
    # todavia) -- alcanza para detectar archivos corruptos con un magic
    # number valido, y para cortar imagenes con una resolucion absurda
    # (p. ej. un PNG muy comprimido en disco pero enorme una vez
    # decodificado, tipo "decompression bomb") antes de que el resto del
    # pipeline llegue a cargarla entera en memoria.
    try:
        with Image.open(io.BytesIO(data)) as img:
            width, height = img.size
    except (UnidentifiedImageError, OSError):
        return "No se pudo leer la imagen. El archivo puede estar dañado."
    if width * height > MAX_IMAGE_PIXELS:
        return "La imagen es demasiado grande. Usa una imagen de menor resolucion."
    return None
