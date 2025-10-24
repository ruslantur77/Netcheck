import asyncio
import signal
from functools import partial
from logging import getLogger

import aio_pika
from rmq_service import ConsumeService, ExchangeConfig, ProduceService, QueueConfig
from rmq_service.schemas import ExchangeType

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
    channel_pool, rmq_credentials: RMQCredentials, producer: ProduceService
) -> tuple[ConsumeService, asyncio.Task]:
    consumer = ConsumeService(
        channel_pool=channel_pool,
        queue_config=QueueConfig(name=rmq_credentials.request_queue),
        exchange_config=ExchangeConfig(
            name=rmq_credentials.request_exchange_name, type=ExchangeType.FANOUT
        ),
    )
    await consumer.setup()
    task = asyncio.create_task(consumer.consume(callback=partial(callback, producer)))
    return consumer, task


async def main():
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
    consumer, consume_task = await setup_consumer(
        channel_pool=channel_pool,
        rmq_credentials=register_response.rmq_credentials,
        producer=producer,
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

    consume_task.cancel()
    try:
        await consume_task
    except asyncio.CancelledError:
        logger.info("Consumer task cancelled")
    except NotImplementedError:
        logger.warning("Signal handlers are not supported on this platform")

    await channel_pool.close()
    await connection_pool.close()

    logger.info("Shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())
