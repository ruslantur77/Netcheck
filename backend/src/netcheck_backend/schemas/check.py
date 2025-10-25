from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_serializer, model_validator


class RequestType(str, Enum):
    INFO = "INFO"
    PING = "PING"
    HTTP = "HTTP"
    TCP_CONNECT = "TCP_CONNECT"
    UDP_CONNECT = "UDP_CONNECT"
    DNS = "DNS"


class CheckRequestBase(BaseModel):
    request_type: RequestType
    host: str
    port: int | None

    @model_validator(mode="after")
    def ensure_scheme(cls, model):
        if model.host and not (
            model.host.startswith("http://") or model.host.startswith("https://")
        ):
            model.host = f"http://{model.host}"
        return model

    model_config = ConfigDict(from_attributes=True)


class CheckRequest(CheckRequestBase):
    request_id: UUID


class CheckRequestInDB(CheckRequest):
    responses: list["CheckResponse"]


class CheckResponseBase(BaseModel):
    success: bool
    error: str | None = None
    result: dict | None = None
    latency_ms: float | None = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class CheckResponse(CheckResponseBase):
    request_id: UUID
    agent_id: UUID
