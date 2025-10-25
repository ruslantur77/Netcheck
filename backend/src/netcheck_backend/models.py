from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from netcheck_backend.schemas.agent import AgentStatus
from netcheck_backend.schemas.check import RequestType


class Base(DeclarativeBase):
    pass


class UserOrm(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(unique=True)
    hashed_password: Mapped[str]
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("TIMEZONE('utc', now())")
    )

    def __init__(
        self,
        email: str,
        hashed_password: str,
    ):
        self.email = email
        self.hashed_password = hashed_password


class RefreshTokensOrm(Base):
    __tablename__ = "refresh_tokens"
    jti: Mapped[UUID] = mapped_column(primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("TIMEZONE('utc', now())")
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    def __init__(
        self,
        jti: UUID,
        user_id: UUID,
        token_hash: str,
        expires_at: datetime,
    ):
        self.jti = jti
        self.user_id = user_id
        self.token_hash = token_hash
        self.expires_at = expires_at


class AgentOrm(Base):
    __tablename__ = "agents"

    id: Mapped[UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(unique=True)
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("TIMEZONE('utc', now())")
    )
    status: Mapped[AgentStatus] = mapped_column(
        server_default=text(f"'{AgentStatus.SETUP.value.upper()}'"), nullable=False
    )
    api_key: Mapped[str] = mapped_column(
        server_default=text("gen_random_uuid()"), unique=True
    )
    rmq_request_queue: Mapped[str] = mapped_column(unique=True)
    rmq_user: Mapped[str] = mapped_column()
    rmq_password: Mapped[str] = mapped_column()

    def __init__(
        self,
        name: str,
        rmq_request_queue: str,
        rmq_user: str,
        rmq_password: str,
    ):
        self.name = name
        self.rmq_request_queue = rmq_request_queue
        self.rmq_user = rmq_user
        self.rmq_password = rmq_password


class CheckRequestOrm(Base):
    __tablename__ = "check_request"

    request_id: Mapped[UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    request_type: Mapped[RequestType] = mapped_column(nullable=False)
    host: Mapped[str]
    port: Mapped[int | None] = mapped_column(nullable=True)

    responses: Mapped[list["CheckResponseOrm"]] = relationship(
        back_populates="request",
        cascade="all, delete-orphan",
        lazy="joined",
    )

    def __init__(self, request_type: RequestType, host: str, port: int | None):
        self.request_type = request_type
        self.host = host
        self.port = port


class CheckResponseOrm(Base):
    __tablename__ = "check_responses"
    agent_id: Mapped[UUID] = mapped_column(primary_key=True)
    request_id: Mapped[UUID] = mapped_column(
        ForeignKey(CheckRequestOrm.request_id), primary_key=True
    )
    success: Mapped[bool]
    error: Mapped[str | None] = mapped_column(nullable=True)
    result: Mapped[dict] = mapped_column(JSONB)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    latency_ms: Mapped[float]

    request: Mapped["CheckRequestOrm"] = relationship(back_populates="responses")

    def __init__(
        self,
        agent_id: UUID,
        request_id: UUID,
        success: bool,
        error: str | None,
        result: dict | None,
        timestamp: datetime,
        latency_ms: float | None,
    ):
        self.agent_id = agent_id
        self.request_id = request_id
        self.success = success
        self.error = error
        self.result = result if result else {}
        self.timestamp = timestamp
        self.latency_ms = latency_ms if latency_ms is not None else -1.0
