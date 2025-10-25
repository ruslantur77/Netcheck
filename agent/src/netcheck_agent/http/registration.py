import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

from netcheck_agent.config import get_config
from netcheck_agent.schemas import RegistrationInfo, RegistrationResponse
from netcheck_agent.utils import get_agent_info


@retry(stop=stop_after_attempt(3), wait=wait_exponential())
async def register_agent():
    config = get_config()
    url = config.REGISTRATION_URL
    token = config.REGISTRATION_TOKEN

    agent_info = await get_agent_info()

    payload = RegistrationInfo(
        token=token,
        hostname=agent_info.hostname,
        local_ip=agent_info.local_ip,
        public_ip=agent_info.public_ip,
        region=agent_info.region,
    ).model_dump(mode="json")

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as resp:
            res = await resp.json()
            return RegistrationResponse.model_validate(res)
