from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    project_name: str = "Berea Marketplace"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/berea_marketplace"

    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    cors_origins: list[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
