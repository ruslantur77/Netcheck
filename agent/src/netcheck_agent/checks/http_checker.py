import datetime

import aiohttp

from netcheck_agent.schemas import CheckRequest, CheckResponse, CheckResponseBase

from .base_checker import BaseChecker
from .schemas import HttpResult


class HttpChecker(BaseChecker):

    async def _make_request(self, request: CheckRequest) -> CheckResponseBase:
        timeout = aiohttp.ClientTimeout(total=5)
        async with aiohttp.ClientSession() as session:
            async with session.get(request.host, timeout=timeout) as resp:
                content = await resp.text(errors="ignore")
                headers = dict(resp.headers)

                ssl_expiry_days = None
                if (
                    resp.url.scheme == "https"
                    and resp.connection
                    and resp.connection.transport
                ):
                    ssl_obj = resp.connection.transport.get_extra_info("ssl_object")
                    if ssl_obj:
                        cert = ssl_obj.getpeercert()
                        if "notAfter" in cert:
                            expire_date = datetime.datetime.strptime(
                                cert["notAfter"], "%b %d %H:%M:%S %Y %Z"
                            )
                            ssl_expiry_days = (
                                expire_date - datetime.datetime.utcnow()
                            ).days

                return CheckResponseBase(
                    success=True,
                    result=HttpResult(
                        status_code=resp.status,
                        headers=headers,
                        redirected=str(resp.url) != request.host,
                        final_url=str(resp.url),
                        content_length=len(content),
                        content_sample=content[:200],
                        ssl_expiry_days=ssl_expiry_days,
                    ),
                )

    async def check(self, request: CheckRequest) -> CheckResponse:
        try:
            result, latency = await self._measure_latency(self._make_request(request))
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
