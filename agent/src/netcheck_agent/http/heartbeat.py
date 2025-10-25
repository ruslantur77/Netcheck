import aiohttp


async def send_heartbeat(heartbeat_endpoint: str, agent_id: str) -> None:
    async with aiohttp.ClientSession() as session:
        async with session.post(
            heartbeat_endpoint,
            json={"agent_id": agent_id},
        ) as response:
            if response.status != 204:
                raise Exception(f"Heartbeat failed with status code {response.status}")
