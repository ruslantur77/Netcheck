from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, DateTime, text
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped


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
