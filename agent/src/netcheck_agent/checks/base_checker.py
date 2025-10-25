import time
from abc import ABC, abstractmethod
from typing import Awaitable

from netcheck_agent.schemas import CheckRequest, CheckResponse, CheckResponseBase


class BaseChecker(ABC):

    @abstractmethod
    async def check(self, request: CheckRequest) -> CheckResponse: ...

    async def _measure_latency(
        self, coro: Awaitable[CheckResponseBase]
    ) -> tuple[CheckResponseBase, float]:
        """
        Универсальный метод измерения времени выполнения асинхронной операции.

        :param coro: корутина (например, HTTP-запрос, ping и т.д.)
        :return: (результат операции, время_в_мс)
        """
        start = time.monotonic()
        result = await coro
        duration_ms = (time.monotonic() - start) * 1000
        return result, round(duration_ms, 2)
