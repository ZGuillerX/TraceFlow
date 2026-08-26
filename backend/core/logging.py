import logging


def configure_logging() -> None:
    """Configura el logging raiz de la app. Se llama una sola vez desde
    main.py al arrancar -- separado del resto del wiring para que
    main.py quede solo como declaracion de la app, sin detalles de
    formato/nivel de logging mezclados ahi."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
