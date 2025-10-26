from enum import Enum
from typing import TYPE_CHECKING

from pydantic_settings import BaseSettings, SettingsConfigDict


class LogLevels(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class Config(BaseSettings):
    LOG_LEVEL: LogLevels

    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASS: str

    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    SECRET_KEY: str

    RMQ_RESPONSE_QUEUE: str
    RMQ_REQUEST_EXCHANGE: str
    RMQ_REQUEST_ROUTING_KEY: str
    RMQ_USER: str
    RMQ_PASS: str
    RMQ_HOST: str
    RMQ_MANAGEMENT_HOST: str
    RMQ_PORT: str
    RMQ_MANAGEMENT_PORT: str
    RMQ_AGENTS_VHOST: str

    REDIS_HOST: str
    REDIS_PORT: int
    REDIS_PASSWORD: str

    AGENT_HEARTBEAT_INTERVAL_SEC: int
    AGENT_HEARTBEAT_TIMEOUT_SEC: int

    ALLOWED_ORIGINS: str

    @property
    def RMQ_URL(self) -> str:
        return f"amqp://{self.RMQ_USER}:{self.RMQ_PASS}@{self.RMQ_HOST}:{self.RMQ_PORT}/{self.RMQ_AGENTS_VHOST}"

    @property
    def DB_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    model_config = SettingsConfigDict(env_file=".env")


_config_instance: Config | None = None


def _get_config() -> Config:
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()  # type: ignore
    return _config_instance


class _ConfigProxy:
    def __getattr__(self, name):
        return getattr(_get_config(), name)

    def __setattr__(self, name, value):
        setattr(_get_config(), name, value)


if TYPE_CHECKING:
    config: Config
else:
    config = _ConfigProxy()
