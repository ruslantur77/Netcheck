from datetime import UTC, datetime
from uuid import UUID

from redis.asyncio import Redis
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from netcheck_backend.exceptions import AlreadyExistsError, NotFoundError
from netcheck_backend.models import CheckRequestOrm, CheckResponseOrm
from netcheck_backend.schemas import (
    CheckRequest,
    CheckRequestBase,
    CheckRequestInDB,
    CheckResponse,
    CheckResponseBase,
)


class CheckService:

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self.session_factory = session_factory

    async def create(self, check_request: CheckRequestBase) -> CheckRequestInDB:
        async with self.session_factory() as session:
            new_check = CheckRequestOrm(
                request_type=check_request.request_type,
                host=check_request.host,
                port=check_request.port,
            )
            session.add(new_check)
            await session.commit()
            await session.refresh(new_check)
            return CheckRequestInDB.model_validate(new_check)

    async def get(self, id: UUID) -> CheckRequestInDB:
        async with self.session_factory() as session:
            result = await session.get(CheckRequestOrm, id)
            if result is None:
                raise NotFoundError("No check request")
            return CheckRequestInDB.model_validate(result)
