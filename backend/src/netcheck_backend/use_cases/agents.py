import re
import secrets
import string
from urllib.parse import quote
from uuid import UUID

import aiohttp

from netcheck_backend.exceptions import AlreadyExistsError, NotFoundError
from netcheck_backend.schemas import (
    AgentCreate,
    AgentInDB,
    AgentRegistrationResponse,
    AgentStatus,
)
from netcheck_backend.schemas.agent import AgentInfo, AgentRegistrationRequest
from netcheck_backend.services.agent_service import AgentCacheService, AgentService

VHOST = "agents_vhost"


def generate_password(length=20) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def sanitize_agent_name(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]", "_", name)


class CreateAgentUseCase:
    def __init__(
        self,
        agent_service: AgentService,
        rmq_admin_user: str,
        rmq_admin_pass: str,
        rmq_host: str,
        rmq_port: int = 15672,
    ) -> None:
        self.agent_service = agent_service
        self.rmq_admin_user = rmq_admin_user
        self.rmq_admin_pass = rmq_admin_pass
        self.rmq_host = f"{rmq_host}:{rmq_port}"

    async def register_agent(self, agent_name: str) -> dict:
        agent_name = sanitize_agent_name(agent_name)
        username = f"agent_{agent_name}"
        password = generate_password()

        queue_in = f"agent.{agent_name}.in"
        queue_out = "agents.out"

        headers = {"content-type": "application/json"}
        auth = aiohttp.BasicAuth(self.rmq_admin_user, self.rmq_admin_pass)

        async with aiohttp.ClientSession(auth=auth) as session:
            # Создание vhost
            vhost_encoded = quote(VHOST, safe="")
            async with session.put(
                f"{self.rmq_host}/api/vhosts/{vhost_encoded}", headers=headers
            ) as resp:
                if resp.status not in (201, 204):
                    text = await resp.text()
                    raise RuntimeError(f"Ошибка создания vhost: {resp.status} {text}")

            # Создание пользователя
            async with session.put(
                f"{self.rmq_host}/api/users/{username}",
                headers=headers,
                json={"password": password, "tags": ""},
            ) as resp:
                resp.raise_for_status()

            # Выставление прав
            configure_regex = f"^agent\\.{agent_name}\\.in$"
            write_regex = f"^{queue_out}$"
            read_regex = f"^{queue_in}$"

            async with session.put(
                f"{self.rmq_host}/api/permissions/{vhost_encoded}/{username}",
                headers=headers,
                json={
                    "configure": configure_regex,
                    "write": write_regex,
                    "read": read_regex,
                },
            ) as resp:
                resp.raise_for_status()  # 204 No Content, JSON не парсим

            # Создание очереди
            queue_encoded = quote(queue_in, safe="")
            async with session.put(
                f"{self.rmq_host}/api/queues/{vhost_encoded}/{queue_encoded}",
                headers=headers,
                json={"auto_delete": False, "durable": True, "arguments": {}},
            ) as resp:
                resp.raise_for_status()

        return {
            "username": username,
            "password": password,
            "queue_in": queue_in,
            "queue_out": queue_out,
            "vhost": VHOST,
        }

    async def execute(self, agent_create: AgentCreate) -> AgentInDB:

        rmq_creds = await self.register_agent(agent_create.name)
        new_agent = await self.agent_service.create(
            name=agent_create.name,
            rmq_request_queue=rmq_creds["queue_in"],
            rmq_user=rmq_creds["username"],
            rmq_password=rmq_creds["password"],
        )
        return new_agent


class DeleteAgentUseCase:

    def __init__(
        self,
        agent_service: AgentService,
        agent_cache_service: AgentCacheService,
        rmq_admin_user: str,
        rmq_admin_pass: str,
        rmq_host: str,
        rmq_port: int = 15672,
    ) -> None:
        self.agent_service = agent_service
        self.rmq_admin_user = rmq_admin_user
        self.rmq_admin_pass = rmq_admin_pass
        self.rmq_host = f"{rmq_host}:{rmq_port}"
        self.agent_cache_service = agent_cache_service

    async def delete_agent_resources(self, agent_name: str):
        agent_name = sanitize_agent_name(agent_name)
        username = f"agent_{agent_name}"
        queue_in = f"agent.{agent_name}.in"

        headers = {"content-type": "application/json"}
        auth = aiohttp.BasicAuth(self.rmq_admin_user, self.rmq_admin_pass)
        vhost_encoded = quote(VHOST, safe="")

        async with aiohttp.ClientSession(auth=auth) as session:
            async with session.delete(
                f"{self.rmq_host}/api/queues/{vhost_encoded}/{queue_in}",
                headers=headers,
            ) as resp:
                if resp.status not in (204, 404):
                    resp.raise_for_status()

            async with session.delete(
                f"{self.rmq_host}/api/users/{username}",
                headers=headers,
            ) as resp:
                if resp.status not in (204, 404):
                    resp.raise_for_status()

    async def execute(self, agent_id: UUID) -> None:
        agent = await self.agent_service.get(agent_id)
        await self.delete_agent_resources(agent_name=agent.name)
        await self.agent_service.delete(agent_id)
        await self.agent_cache_service.delete_agent_info(agent_id)


class RegisterAgentUseCase:
    def __init__(
        self,
        agent_service: AgentService,
        agent_cache_service: AgentCacheService,
    ) -> None:
        self.agent_service = agent_service
        self.agent_cache_service = agent_cache_service

    async def execute(self, agent_reg_info: AgentRegistrationRequest) -> AgentInDB:
        agent = await self.agent_service.get_by_api_key(
            api_key=str(agent_reg_info.token)
        )
        await self.agent_service.update_status(agent.id, AgentStatus.ACTIVE)
        await self.agent_cache_service.set_agent_info(
            agent.id,
            info=agent_reg_info,
        )
        return agent
