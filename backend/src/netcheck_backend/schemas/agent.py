from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


class AgentStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SETUP = "setup"
    REVOKED = "revoked"


class AgentCreate(BaseModel):
    name: str


class AgentResponse(BaseModel):
    api_key: str | None
    id: UUID
    name: str
    registered_at: datetime
    status: AgentStatus

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def remove_api_key_if_none(cls, model):
        if model.status != AgentStatus.SETUP:
            model.api_key = None
        return model


class AgentInfo(BaseModel):
    hostname: str
    region: str
    local_ip: str
    public_ip: str


class AgentRegistrationRequest(AgentInfo):
    token: UUID


class RMQCredentials(BaseModel):
    request_queue: str
    response_queue: str
    request_exchange_name: str
    rmq_user: str
    rmq_password: str
    rmq_host: str
    rmq_port: str


class AgentRegistrationResponse(BaseModel):
    rmq_credentials: RMQCredentials
    agent_id: UUID
    heartbeat_interval_sec: int
    heartbeat_endpoint: str


class AgentInDB(AgentResponse):
    rmq_request_queue: str
    rmq_user: str
    rmq_password: str
