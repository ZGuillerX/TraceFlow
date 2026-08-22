from functools import lru_cache

from rembg import new_session, remove

MODEL_NAME = "birefnet-general"


@lru_cache(maxsize=1)
def get_session():
    return new_session(MODEL_NAME)


def remove_background(image_bytes: bytes) -> bytes:
    return remove(image_bytes, session=get_session())
