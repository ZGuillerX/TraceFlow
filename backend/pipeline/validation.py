from config import MAX_UPLOAD_SIZE_BYTES

IMAGE_SIGNATURES = {
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/webp": [b"RIFF"],
}


def validate_image(content_type: str | None, data: bytes) -> str | None:
    """Valida tipo, tamano y contenido real del archivo (magic numbers).

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
    return None
