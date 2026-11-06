import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth, conversations, health, listings, uploads

# Uvicorn only configures its own loggers; make app.* INFO logs show up too.
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

settings = get_settings()

app = FastAPI(title=settings.project_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.api_v1_prefix)
app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(listings.router, prefix=settings.api_v1_prefix)
app.include_router(uploads.router, prefix=settings.api_v1_prefix)
app.include_router(conversations.router, prefix=settings.api_v1_prefix)
