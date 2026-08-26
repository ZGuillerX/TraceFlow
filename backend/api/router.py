from fastapi import APIRouter

from api.routers.remove_background import router as remove_background_router
from api.routers.vectorize import router as vectorize_router

router = APIRouter()
router.include_router(vectorize_router)
router.include_router(remove_background_router)
