# app/config.py
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

CONFIG_FILE_PATH = Path(__file__)
APP_DIR = CONFIG_FILE_PATH.parent
SERVER_DIR = APP_DIR.parent
ENV_FILE_PATH = SERVER_DIR / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE_PATH, env_file_encoding='utf-8', case_sensitive=False )

    APP_ENV: str = "development"
    UPLOAD_FOLDER: str = os.path.join(APP_DIR, "uploads")
    DATABASE_FOLDER: str = os.path.join(APP_DIR, "database")
    STATIC_FOLDER: str = os.path.join(APP_DIR, "frontend", "assets")
    MEDIA_FOLDER: str = os.path.join(APP_DIR, "frontend", "media")
    FRONTEND_FOLDER: str = os.path.join(APP_DIR, "frontend")
    AVATARS_FOLDER: str = os.path.join(APP_DIR, "avatars")
    PORT: int

    CORS_SUPPORTS_CREDENTIALS: bool = True

    SECRET_KEY: str
    JWT_SECRET_KEY: str

settings = Settings()