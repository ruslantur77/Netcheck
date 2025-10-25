import asyncio
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from netcheck_backend.exceptions import AlreadyExistsError, NotFoundError
from netcheck_backend.models import RefreshTokensOrm
from netcheck_backend.schemas import RefreshTokenData


class RefreshTokenService:

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self.session_factory = session_factory

    async def save(
        self, jti: UUID, token_hash: str, expiration_time: datetime, user_id: UUID
    ) -> RefreshTokenData:
        try:
            async with self.session_factory() as session:
                new_token = RefreshTokensOrm(
                    jti=jti,
                    user_id=user_id,
                    token_hash=token_hash,
                    expires_at=expiration_time,
                )
                session.add(new_token)
                await session.commit()
                await session.refresh(new_token)
                return RefreshTokenData.model_validate(new_token, from_attributes=True)
        except IntegrityError as e:
            orig_message = str(e.orig).lower()
            if "duplicate" in orig_message:
                raise AlreadyExistsError(message=f"Token with jti {jti} already exists")
            raise NotFoundError(message=f"User with id {user_id} not exists") from e

    async def find_by_jti(self, jti: UUID) -> RefreshTokenData | None:
        async with self.session_factory() as session:
            res = await session.get(RefreshTokensOrm, jti)
            if res is None:
                return None
            if res.expires_at <= datetime.now(timezone.utc):
                asyncio.create_task(self.revoke_token(res.jti))  # ?
                return None
            return RefreshTokenData.model_validate(res, from_attributes=True)

    async def revoke_token(self, jti: UUID) -> None:
        async with self.session_factory() as session:
            stmt = delete(RefreshTokensOrm).filter_by(jti=jti)
            await session.execute(stmt)
            await session.commit()

    async def revoke_for_user(self, user_id: UUID) -> None:
        async with self.session_factory() as session:
            stmt = delete(RefreshTokensOrm).filter_by(user_id=user_id)
            await session.execute(stmt)
            await session.commit()
