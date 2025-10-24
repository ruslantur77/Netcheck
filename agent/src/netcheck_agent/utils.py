import socket
import time
from functools import wraps

import aiohttp

from netcheck_agent.config import get_config
from netcheck_agent.schemas import AgentInfo


def async_ttl_cache(ttl: float):
    """ttl in seconds"""

    def decorator(func):
        cache = {"value": None, "timestamp": 0}

        @wraps(func)
        async def wrapper():
            now = time.time()
            if cache["value"] is None or now - cache["timestamp"] > ttl:
                cache["value"] = await func()
                cache["timestamp"] = now
            return cache["value"]

        return wrapper

    return decorator


@async_ttl_cache(600)
async def get_agent_info(ttl_hash=None) -> AgentInfo:
    del ttl_hash

    config = get_config()

    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)

    async with aiohttp.ClientSession() as session:
        async with session.get(config.GET_IP_API_URL) as resp:
            public_ip = await resp.text()

    region = config.REGION

    return AgentInfo(
        hostname=hostname, region=region, local_ip=local_ip, public_ip=public_ip
    )
