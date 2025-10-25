from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, field_serializer, model_validator


class RMQCredentials(BaseModel):
    request_queue: str
    response_queue: str
    request_exchange_name: str
    rmq_user: str
    rmq_password: str
    rmq_host: str
    rmq_port: str

    @property
    def RMQ_URL(self) -> str:
        return f"amqp://{self.rmq_user}:{self.rmq_password}@{self.rmq_host}:{self.rmq_port}/"


class AgentInfo(BaseModel):
    hostname: str
    region: str
    local_ip: str
    public_ip: str


class RegistrationInfo(AgentInfo):
    token: UUID


class RegistrationResponse(BaseModel):
    rmq_credentials: RMQCredentials
    agent_id: UUID
    heartbeat_interval_sec: int
    heartbeat_endpoint: str


class RequestType(str, Enum):
    INFO = "INFO"
    PING = "PING"
    HTTP = "HTTP"
    TCP_CONNECT = "TCP_CONNECT"
    UDP_CONNECT = "UDP_CONNECT"
    DNS = "DNS"


class CheckRequest(BaseModel):
    request_type: RequestType
    host: str
    port: int | None

    @model_validator(mode="before")
    def ensure_scheme(cls, values):
        host = values.get("host")
        if host and not (host.startswith("http://") or host.startswith("https://")):
            values["host"] = f"http://{host}"
        return values


class CheckRequestRMQ(CheckRequest):
    request_id: UUID


class CheckResponseBase(BaseModel):
    success: bool
    error: str | None = None
    result: BaseModel | None = None

    @field_serializer("result")
    def serialize_result(self, result: BaseModel | None, info):
        if result is None:
            return {}
        mode = info.mode
        context = info.context
        return result.model_dump(mode=mode, context=context)


class CheckResponse(CheckResponseBase):
    latency_ms: float | None = None
    timestamp: datetime


class CheckResponseRMQ(CheckResponse):
    request_id: UUID
