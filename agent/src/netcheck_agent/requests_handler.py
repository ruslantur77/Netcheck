from logging import getLogger
from uuid import UUID

from rmq_service import Message, ProduceService

from netcheck_agent.checks import BaseChecker, HttpChecker
from netcheck_agent.schemas import CheckRequestRMQ, CheckResponseRMQ, RequestType

checkers: dict[RequestType, type[BaseChecker]] = {
    RequestType.HTTP: HttpChecker,
}


logger = getLogger(__name__)


async def callback(producer: ProduceService, agent_id: UUID, data: bytes, **kwargs):
    logger.info(f"Received request: {data.decode()}")

    request = CheckRequestRMQ.model_validate_json(data)

    checker = checkers.get(request.request_type)
    if not checker:
        logger.error(f"Unsupported request type: {request.request_type}")
        return
    checker_instance = checker()
    response = await checker_instance.check(request)
    response_rmq = CheckResponseRMQ(
        success=response.success,
        request_id=request.request_id,
        result=response.result,
        error=response.error,
        latency_ms=response.latency_ms,
        timestamp=response.timestamp,
        agent_id=agent_id,
    )
    await producer.produce(Message.from_json(response_rmq.model_dump(mode="json")))
