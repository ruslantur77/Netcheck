import asyncio
import signal
from functools import partial
from logging import getLogger
from uuid import UUID

import aio_pika
from rmq_service import ConsumeService, ProduceService, QueueConfig

from netcheck_agent.config import get_config
from netcheck_agent.http.heartbeat import send_heartbeat
from netcheck_agent.http.registration import register_agent
from netcheck_agent.logger import setup_logger
from netcheck_agent.requests_handler import callback
from netcheck_agent.schemas import RMQCredentials

setup_logger()

logger = getLogger(__name__)


def get_channel_pools(rmq_url: str):
    async def create_connection():
        return await aio_pika.connect_robust(rmq_url)

    connection_pool = aio_pika.pool.Pool(create_connection, max_size=10)

    async def create_channel():
        async with connection_pool.acquire() as connection:
            return await connection.channel()

    channel_pool = aio_pika.pool.Pool(create_channel, max_size=100)
    return connection_pool, channel_pool


async def setup_producer(
    channel_pool, rmq_credentials: RMQCredentials
) -> ProduceService:
    producer = ProduceService(
        channel_pool=channel_pool, routing_key=rmq_credentials.response_queue
    )
    await producer.setup()
    return producer


async def setup_consumer(
    channel_pool,
    rmq_credentials: RMQCredentials,
    producer: ProduceService,
    num_workers: int,
    agent_id: UUID,
) -> tuple[ConsumeService, list[asyncio.Task]]:
    consumer = ConsumeService(
        channel_pool=channel_pool,
        queue_config=QueueConfig(name=rmq_credentials.request_queue),
        # exchange_config=ExchangeConfig(
        #     name=rmq_credentials.request_exchange_name, type=ExchangeType.FANOUT
        # ),
    )
    await consumer.setup()

    tasks = [
        asyncio.create_task(
            consumer.consume(callback=partial(callback, producer, agent_id))
        )
        for _ in range(num_workers)
    ]
    return consumer, tasks


async def heartbeat_loop(heartbeat_endpoint: str, agent_id: str, interval_sec: int):
    while True:
        try:
            await send_heartbeat(heartbeat_endpoint, agent_id)
            logger.debug("Heartbeat sent successfully")
        except Exception as e:
            logger.error(f"Heartbeat failed: {e}")
        await asyncio.sleep(interval_sec)


async def main():
    config = get_config()
    try:
        register_response = await register_agent()
    except Exception:
        logger.fatal("Agent registration failed", exc_info=True)
        exit(-1)

    connection_pool, channel_pool = get_channel_pools(
        register_response.rmq_credentials.RMQ_URL
    )
    producer = await setup_producer(
        channel_pool=channel_pool,
        rmq_credentials=register_response.rmq_credentials,
    )
    consumer, consume_tasks = await setup_consumer(
        channel_pool=channel_pool,
        rmq_credentials=register_response.rmq_credentials,
        producer=producer,
        num_workers=config.NUM_WORKERS,
        agent_id=register_response.agent_id,
    )

    heartbeat_task = asyncio.create_task(
        heartbeat_loop(
            heartbeat_endpoint=register_response.heartbeat_endpoint,
            agent_id=str(register_response.agent_id),
            interval_sec=register_response.heartbeat_interval_sec,
        )
    )

    stop_event = asyncio.Event()

    logger.info("Agent started")

    def _signal_handler():
        logger.info("Shutdown signal received")
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _signal_handler)

    await stop_event.wait()

    consumer.stop()
    for i in consume_tasks:
        i.cancel()
    heartbeat_task.cancel()
    try:
        await asyncio.gather(*consume_tasks, heartbeat_task)
    except asyncio.CancelledError:
        logger.info("Consumer task cancelled")
    except NotImplementedError:
        logger.warning("Signal handlers are not supported on this platform")

    await channel_pool.close()
    await connection_pool.close()

    logger.info("Shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())
