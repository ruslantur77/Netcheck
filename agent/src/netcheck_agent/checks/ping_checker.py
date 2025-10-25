import datetime
from urllib.parse import urlparse

import aioping

from netcheck_agent.schemas import CheckRequest, CheckResponse, CheckResponseBase

from .base_checker import BaseChecker
from .schemas import PingResult


class PingChecker(BaseChecker):

    async def _ping(self, request: CheckRequest) -> CheckResponseBase:
        try:
            parsed = urlparse(request.host)
            host = parsed.hostname or request.host
            latency = await aioping.ping(host, timeout=2) * 1000
            return CheckResponseBase(
                success=True, result=PingResult(latency_ms=latency)
            )
        except Exception as e:
            return CheckResponseBase(success=False, result=PingResult(error=str(e)))

    async def check(self, request: CheckRequest) -> CheckResponse:
        try:
            result, latency = await self._measure_latency(self._ping(request))
            return CheckResponse(
                success=result.success,
                latency_ms=latency,
                result=result.result,
                timestamp=datetime.datetime.now(datetime.UTC),
            )
        except Exception as e:
            return CheckResponse(
                success=False,
                error=str(e),
                timestamp=datetime.datetime.now(datetime.UTC),
            )
