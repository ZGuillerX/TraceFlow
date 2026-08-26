import pytest

from api.routers.remove_background import remove_bg_limiter
from api.routers.vectorize import vectorize_burst_limiter, vectorize_limiter


@pytest.fixture(autouse=True)
def _reset_rate_limiters():
    """Los limiters son singletons a nivel de modulo, compartidos entre
    todos los tests de este paquete -- sin resetearlos entre cada uno,
    el orden de ejecucion importaria (un test agotaria el cupo del
    siguiente), lo que seria fragil e impredecible."""
    vectorize_limiter.reset()
    vectorize_burst_limiter.reset()
    remove_bg_limiter.reset()
    yield
