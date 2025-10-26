from datetime import UTC, datetime
from uuid import UUID

from redis.asyncio import Redis
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from netcheck_backend.exceptions import AlreadyExistsError, NotFoundError
from netcheck_backend.models import AgentOrm
from netcheck_backend.schemas import AgentInDB, AgentInfo, AgentStatus


class AgentService:

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self.session_factory = session_factory

    async def create(
        self,
        name: str,
        rmq_request_queue: str,
        rmq_user: str,
        rmq_password: str,
    ) -> AgentInDB:
        async with self.session_factory() as session:
            stmt = (
                insert(AgentOrm)
                .values(
                    name=name,
                    rmq_request_queue=rmq_request_queue,
                    rmq_user=rmq_user,
                    rmq_password=rmq_password,
                )
                .on_conflict_do_nothing(index_elements=["name"])
                .returning(AgentOrm)
            )

            result = await session.execute(stmt)
            await session.commit()
            agent = result.scalar_one_or_none()

            if not agent:
                raise AlreadyExistsError("Agent with this name already exists")

            return AgentInDB.model_validate(agent)

    async def get(self, agent_id: UUID) -> AgentInDB:
        async with self.session_factory() as session:
            result = await session.get(AgentOrm, agent_id)
            if result is None:
                raise NotFoundError("Agent not found")
            return AgentInDB.model_validate(result)

    async def get_all(self) -> list[AgentInDB]:
        async with self.session_factory() as session:
            stmt = select(AgentOrm)
            result = await session.execute(stmt)
            agents = result.scalars().all()
            return [AgentInDB.model_validate(agent) for agent in agents]

    async def get_by_api_key(self, api_key: str) -> AgentInDB:
        async with self.session_factory() as session:
            stmt = select(AgentOrm).where(AgentOrm.api_key == api_key)
            result = await session.execute(stmt)
            agent = result.scalar_one_or_none()
            if agent is None:
                raise NotFoundError("Agent not found")
            return AgentInDB.model_validate(agent)

    async def update_status(self, agent_id: UUID, new_status: AgentStatus) -> None:
        async with self.session_factory() as session:
            agent = await session.get(AgentOrm, agent_id)
            if agent is None:
                raise NotFoundError("Agent not found")
            agent.status = new_status
            await session.commit()

    async def delete(self, agent_id: UUID) -> None:
        async with self.session_factory() as session:
            stmt = delete(AgentOrm).where(AgentOrm.id == agent_id)
            result = await session.execute(stmt)
            if result.rowcount == 0:
                raise NotFoundError("Agent not found")
            await session.commit()


class AgentCacheService:
    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    async def set_agent_heartbeat(self, agent_id: UUID) -> None:
        await self.redis.set(
            f"agent:{agent_id}:heartbeat", datetime.now(UTC).isoformat(), ex=120
        )

    async def get_agent_heartbeat(self, agent_id: UUID) -> datetime | None:
        heartbeat_str = await self.redis.get(f"agent:{agent_id}:heartbeat")
        if heartbeat_str is None:
            return None
        return datetime.fromisoformat(heartbeat_str)

    async def set_agent_info(self, agent_id: UUID, info: AgentInfo) -> None:
        await self.redis.hset(
            f"agent:{agent_id}:info",
            mapping={
                "hostname": str(info.hostname),
                "region": str(info.region),
                "local_ip": str(info.local_ip),
                "public_ip": str(info.public_ip),
            },
        )  # type: ignore

    async def get_agent_info(self, agent_id: UUID) -> AgentInfo | None:
        info = await self.redis.hgetall(f"agent:{agent_id}:info")  # type: ignore
        if not info:
            return None
        return AgentInfo(
            hostname=info["hostname"],
            region=info["region"],
            local_ip=info["local_ip"],
            public_ip=info["public_ip"],
        )

    async def delete_agent_info(self, agent_id: UUID) -> None:
        await self.redis.delete(f"agent:{agent_id}:info")
