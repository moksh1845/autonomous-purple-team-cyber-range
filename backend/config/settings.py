"""
Centralized application configuration.

All secrets and environment-specific values (database URL, JWT secret,
Wazuh credentials, CORS origins) are loaded from environment variables
(or a local .env file during development) via pydantic-settings.

NOTHING in this file is a real credential. Real values live only in
the untracked .env file on each developer's / server's machine.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ---- Database -----------------------------------------------------
    DATABASE_URL: str

    # ---- JWT -------------------------------------------------------------
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ---- Wazuh Manager API ------------------------------------------------
    WAZUH_HOST: str
    WAZUH_USER: str
    WAZUH_PASSWORD: str
    WAZUH_VERIFY_SSL: bool = False

    # ---- Wazuh Indexer (OpenSearch) ---------------------------------------
    INDEXER_HOST: str
    INDEXER_USER: str
    INDEXER_PASSWORD: str
    INDEXER_VERIFY_SSL: bool = False

    # ---- Custom Wazuh Collector (optional, port 9000 service) -------------
    COLLECTOR_URL: str = "http://localhost:9000"

    # ---- CORS --------------------------------------------------------------
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — env is read once per process."""
    return Settings()


settings = get_settings()
