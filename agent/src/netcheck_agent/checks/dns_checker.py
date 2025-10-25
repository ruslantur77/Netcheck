import datetime
from urllib.parse import urlparse

import aiodns

from netcheck_agent.schemas import CheckRequest, CheckResponse, CheckResponseBase

from .base_checker import BaseChecker
from .schemas import DnsResult


class DnsChecker(BaseChecker):

    async def _resolve(self, request: CheckRequest) -> CheckResponseBase:
        resolver = aiodns.DNSResolver(timeout=5)

        parsed = urlparse(request.host)
        domain = parsed.hostname or request.host

        result = DnsResult()

        try:
            # A-записи
            try:
                a_records = await resolver.query(domain, "A")
                result.a_records = [str(r.host) for r in a_records]
            except aiodns.error.DNSError:
                result.a_records = []

            # AAAA-записи
            try:
                aaaa_records = await resolver.query(domain, "AAAA")
                result.aaaa_records = [str(r.host) for r in aaaa_records]
            except aiodns.error.DNSError:
                result.aaaa_records = []

            # MX-записи
            try:
                mx_records = await resolver.query(domain, "MX")
                result.mx_records = [
                    f"{r.host} (priority {r.priority})" for r in mx_records
                ]

            except aiodns.error.DNSError:
                result.mx_records = []

            # NS-записи
            try:
                ns_records = await resolver.query(domain, "NS")
                result.ns_records = [str(r.host) for r in ns_records]
            except aiodns.error.DNSError:
                result.ns_records = []

            # TXT-записи
            try:
                txt_records = await resolver.query(domain, "TXT")
                result.txt_records = ["".join(str(r.text)) for r in txt_records]
            except aiodns.error.DNSError:
                result.txt_records = []

            return CheckResponseBase(success=True, result=result)

        except Exception as e:
            result.error = str(e)
            return CheckResponseBase(success=False, result=result)

    async def check(self, request: CheckRequest) -> CheckResponse:
        try:
            result, latency = await self._measure_latency(self._resolve(request))
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
