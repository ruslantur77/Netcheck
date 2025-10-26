from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from rmq_service import Message, ProduceService

from netcheck_backend.dependencies import (
    get_agent_cache_service,
    get_check_request_produce_service,
    get_check_service,
)
from netcheck_backend.schemas import (
    CheckRequest,
    CheckRequestBase,
    CheckRequestResponse,
    CheckResponseWithAgentInfo,
)
from netcheck_backend.services import (
    CheckService,
)
from netcheck_backend.services.agent_service import AgentCacheService

router = APIRouter(prefix="/api/v1/check", tags=["check"])


@router.post("/")
async def check(
    check_request: CheckRequestBase,
    produce_service: Annotated[
        ProduceService, Depends(get_check_request_produce_service)
    ],
    check_service: Annotated[CheckService, Depends(get_check_service)],
):
    res = await check_service.create(check_request=check_request)
    message = Message.from_json(
        CheckRequest.model_validate(res).model_dump(mode="json")
    )
    await produce_service.setup()
    await produce_service.produce(message)
    return res


@router.get("/{task_id}")
async def get_check_task(
    task_id: UUID,
    check_service: Annotated[CheckService, Depends(get_check_service)],
    agent_cache_service: Annotated[AgentCacheService, Depends(get_agent_cache_service)],
):
    res = await check_service.get(task_id)
    responses = []
    for i in res.responses:
        agent_info = await agent_cache_service.get_agent_info(i.agent_id)
        responses.append(
            CheckResponseWithAgentInfo(
                **i.model_dump(mode="json"), agent_info=agent_info
            )
        )

    return CheckRequestResponse(
        **res.model_dump(mode="json", exclude=["responses"]), responses=responses
    )
