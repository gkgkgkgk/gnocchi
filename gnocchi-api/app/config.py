from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = ""
    anthropic_api_key: str = ""
    database_url: str = "postgresql+asyncpg:///gnocchi?host=/tmp"
    image_storage_dir: Path = Path("./.data/images")
    port: int = 8001

    @property
    def sqlalchemy_url(self) -> str:
        """Normalize the URL so SQLAlchemy always picks the async driver.
        The serverkepets registry injects a plain `postgresql://…`, which
        SQLAlchemy would try to open with psycopg2 (sync) and fail."""
        url = self.database_url
        if url.startswith("postgresql://"):
            url = "postgresql+asyncpg://" + url[len("postgresql://"):]
        return url


settings = Settings()

# Ensure the storage dir exists so /images and uploads work from turn one.
settings.image_storage_dir.mkdir(parents=True, exist_ok=True)
