import asyncio
import datetime
from urllib.parse import urlparse

from netcheck_agent.schemas import CheckRequest, CheckResponse, CheckResponseBase

from .base_checker import BaseChecker
from .schemas import TcpResult


class TcpChecker(BaseChecker):

    async def _connect(self, request: CheckRequest) -> CheckResponseBase:
        parsed = urlparse(request.host)
        host = parsed.hostname or request.host
        port = request.port or 80

        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port), timeout=5
            )
            writer.close()
            await writer.wait_closed()
            return CheckResponseBase(
                success=True, result=TcpResult(success_connect=True)
            )
        except Exception as e:
            return CheckResponseBase(
                success=False, result=TcpResult(success_connect=False, error=str(e))
            )

    async def check(self, request: CheckRequest) -> CheckResponse:
        try:
            result, latency = await self._measure_latency(self._connect(request))
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
