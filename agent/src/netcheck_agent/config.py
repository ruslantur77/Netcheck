from enum import Enum
from uuid import UUID

from pydantic_settings import BaseSettings, SettingsConfigDict


class LogLevels(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class Config(BaseSettings):
    LOG_LEVEL: LogLevels
    REGISTRATION_TOKEN: UUID
    REGISTRATION_URL: str
    REGION: str
    GET_IP_API_URL: str
    NUM_WORKERS: int

    model_config = SettingsConfigDict(env_file=".env")


_config_instance: Config | None = None


def get_config() -> Config:
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()  # type: ignore
    return _config_instance
