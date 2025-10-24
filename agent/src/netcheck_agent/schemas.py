from uuid import UUID

from pydantic import BaseModel


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
    refresh_token: str
    access_token: str
