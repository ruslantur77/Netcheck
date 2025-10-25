from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from netcheck_backend.config import Config
from netcheck_backend.dependencies import (
    get_access_token_data,
    get_agent_cache_service,
    get_agent_service,
    get_auth_data,
    get_config,
    get_refresh_token_data,
    get_secret_key,
    get_token_service,
    get_user_service,
)
from netcheck_backend.schemas import (
    AgentCreate,
    AgentHeartbeat,
    AgentRegistrationRequest,
    AgentRegistrationResponse,
    AgentResponse,
    ErrorResponse,
    RefreshTokenData,
    RMQCredentials,
    TokenResponse,
    UserAuth,
)
from netcheck_backend.schemas.token import AccessTokenData
from netcheck_backend.services import (
    AgentCacheService,
    AgentService,
    RefreshTokenService,
    UserService,
)
from netcheck_backend.use_cases import (
    AuthUseCase,
    CreateTokenPairUseCase,
    RefreshTokenPairUseCase,
)
from netcheck_backend.use_cases.agents import (
    CreateAgentUseCase,
    DeleteAgentUseCase,
    RegisterAgentUseCase,
)

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


@router.post("/", response_model=AgentResponse)
async def create_agent(
    agent_data: AgentCreate,
    agent_service: Annotated[AgentService, Depends(get_agent_service)],
    config: Annotated[Config, Depends(get_config)],
    access_token_data: Annotated[AccessTokenData, Depends(get_access_token_data)],
):
    uc = CreateAgentUseCase(
        agent_service=agent_service,
        rmq_admin_user=config.RMQ_USER,
        rmq_admin_pass=config.RMQ_PASS,
        rmq_host=config.RMQ_MANAGEMENT_HOST,
    )
    res = await uc.execute(agent_data)
    return AgentResponse.model_validate(res)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    agent_service: Annotated[AgentService, Depends(get_agent_service)],
    agent_cache_service: Annotated[AgentCacheService, Depends(get_agent_cache_service)],
    access_token_data: Annotated[AccessTokenData, Depends(get_access_token_data)],
):
    try:
        agent = await agent_service.get(agent_id)
        agent = AgentResponse.model_validate(agent)
        agent.agent_info = await agent_cache_service.get_agent_info(agent_id)
        return agent
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found"
        )


@router.get("/", response_model=list[AgentResponse])
async def get_all_agents(
    agent_service: Annotated[AgentService, Depends(get_agent_service)],
    agent_cache_service: Annotated[AgentCacheService, Depends(get_agent_cache_service)],
    access_token_data: Annotated[AccessTokenData, Depends(get_access_token_data)],
):
    agents = await agent_service.get_all()
    responses = []
    for agent in agents:
        agent_info = await agent_cache_service.get_agent_info(agent.id)
        responses.append(
            AgentResponse(
                **agent.model_dump(exclude=["agent_info"]), agent_info=agent_info
            )
        )
    return responses


@router.post("/heartbeat", status_code=status.HTTP_204_NO_CONTENT)
async def agent_heartbeat(
    heartbeat: Annotated[AgentHeartbeat, Depends()],
    agent_cache_service: Annotated[AgentCacheService, Depends(get_agent_cache_service)],
):
    await agent_cache_service.set_agent_heartbeat(heartbeat.agent_id)


@router.post("/register")
async def register_agent(
    request: Request,
    registration_request: AgentRegistrationRequest,
    agent_service: Annotated[AgentService, Depends(get_agent_service)],
    agent_cache_service: Annotated[AgentCacheService, Depends(get_agent_cache_service)],
    config: Annotated[Config, Depends(get_config)],
):
    uc = RegisterAgentUseCase(
        agent_service=agent_service, agent_cache_service=agent_cache_service
    )
    res = await uc.execute(registration_request)
    return AgentRegistrationResponse(
        rmq_credentials=RMQCredentials(
            request_queue=res.rmq_request_queue,
            response_queue=config.RMQ_RESPONSE_QUEUE,
            request_exchange_name=config.RMQ_REQUEST_EXCHANGE,
            rmq_user=res.rmq_user,
            rmq_password=res.rmq_password,
            rmq_host=config.RMQ_HOST,
            rmq_port=config.RMQ_PORT,
        ),
        agent_id=res.id,
        heartbeat_interval_sec=config.AGENT_HEARTBEAT_INTERVAL_SEC,
        heartbeat_endpoint=str(request.url_for("agent_heartbeat")),
    )


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: UUID,
    agent_service: Annotated[AgentService, Depends(get_agent_service)],
    agent_cache_service: Annotated[AgentCacheService, Depends(get_agent_cache_service)],
    config: Annotated[Config, Depends(get_config)],
    access_token_data: Annotated[AccessTokenData, Depends(get_access_token_data)],
):
    uc = DeleteAgentUseCase(
        agent_service=agent_service,
        agent_cache_service=agent_cache_service,
        rmq_admin_user=config.RMQ_USER,
        rmq_admin_pass=config.RMQ_PASS,
        rmq_host=config.RMQ_MANAGEMENT_HOST,
    )
    await uc.execute(agent_id)
