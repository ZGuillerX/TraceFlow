import io

from PIL import Image

from core.config import MAX_IMAGE_PIXELS, MAX_UPLOAD_SIZE_BYTES
from pipeline.validation import validate_image


def _image_bytes(fmt: str, size: tuple[int, int] = (50, 50)) -> bytes:
    img = Image.new("RGB", size, (10, 20, 30))
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def test_png_valido_pasa():
    assert validate_image("image/png", _image_bytes("PNG")) is None


def test_jpeg_valido_pasa():
    assert validate_image("image/jpeg", _image_bytes("JPEG")) is None


def test_webp_valido_pasa():
    assert validate_image("image/webp", _image_bytes("WEBP")) is None


def test_content_type_no_soportado():
    error = validate_image("image/gif", _image_bytes("PNG"))
    assert error == "Formato no soportado. Usa PNG, JPG o WEBP."


def test_tamano_excedido():
    data = b"\x89PNG\r\n\x1a\n" + b"0" * (MAX_UPLOAD_SIZE_BYTES + 1)
    error = validate_image("image/png", data)
    assert error is not None and "supera el limite" in error


def test_magic_number_no_coincide():
    error = validate_image("image/png", b"esto no es un png en absoluto")
    assert error == "El contenido del archivo no coincide con el formato declarado."


def test_webp_sin_marcador_interno():
    data = b"RIFF" + b"\x00" * 4 + b"NOPE" + b"0" * 20
    error = validate_image("image/webp", data)
    assert error == "El contenido del archivo no coincide con el formato declarado."


def test_bytes_corruptos_con_magic_number_valido():
    data = b"\x89PNG\r\n\x1a\n" + b"esto esta truncado y corrupto de verdad"
    error = validate_image("image/png", data)
    assert error == "No se pudo leer la imagen. El archivo puede estar dañado."


def test_excede_megapixeles():
    # un solo color hace la imagen muy comprimible, asi que 6000x6000
    # (36M px, por encima de MAX_IMAGE_PIXELS) sigue pesando menos que
    # MAX_UPLOAD_SIZE_BYTES en disco -- el caso real que este chequeo
    # de resolucion cubre y que el limite de tamano de archivo no cubre.
    side = 6000
    assert side * side > MAX_IMAGE_PIXELS
    img = Image.new("RGB", (side, side), (0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data = buf.getvalue()
    assert len(data) <= MAX_UPLOAD_SIZE_BYTES
    error = validate_image("image/png", data)
    assert error == "La imagen es demasiado grande. Usa una imagen de menor resolucion."
