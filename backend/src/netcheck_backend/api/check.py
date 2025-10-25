from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from rmq_service import Message, ProduceService

from netcheck_backend.dependencies import (
    get_check_request_produce_service,
    get_check_service,
)
from netcheck_backend.schemas import (
    CheckRequest,
    CheckRequestBase,
)
from netcheck_backend.services import (
    CheckService,
)

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
):
    return await check_service.get(task_id)
