import asyncio
import logging
from contextlib import asynccontextmanager
from functools import partial

import aio_pika
from fastapi import FastAPI
from redis.asyncio import Redis
from rmq_service import ConsumeService, QueueConfig
from sqlalchemy.ext.asyncio import async_sessionmaker

from netcheck_backend.config import config
from netcheck_backend.database import init_database
from netcheck_backend.schemas import CheckResponse
from netcheck_backend.services import CheckResponseService
from netcheck_backend.tasks import setup_tasks

logger = logging.getLogger(__name__)


def get_channel_pools():
    async def create_connection():
        return await aio_pika.connect_robust(config.RMQ_URL)

    connection_pool = aio_pika.pool.Pool(create_connection, max_size=10)

    async def create_channel():
        async with connection_pool.acquire() as connection:
            return await connection.channel()

    channel_pool = aio_pika.pool.Pool(create_channel, max_size=100)
    return connection_pool, channel_pool


async def response_callback(check_service: CheckResponseService, data: bytes, **kwargs):
    try:
        response = CheckResponse.model_validate_json(data)
        await check_service.create(response)
    except Exception:
        logger.error(
            f"Error validating failed reminder. Raw data: {data}", exc_info=True
        )


async def setup_consume_registered_user_task(
    channel_pool: aio_pika.pool.Pool, session_factory: async_sessionmaker
):
    response_consumer = ConsumeService(
        channel_pool,
        queue_config=QueueConfig(name=config.RMQ_RESPONSE_QUEUE),
    )
    await response_consumer.setup()

    consume_users_task = asyncio.create_task(
        response_consumer.consume(
            partial(
                response_callback,
                check_service=CheckResponseService(session_factory=session_factory),
            )
        )
    )
    return consume_users_task


@asynccontextmanager
async def startup_event(app: FastAPI):
    app.state.db_engine, app.state.session_factory = await init_database()
    app.state.connection_pool, app.state.channel_pool = get_channel_pools()
    app.state.redis_client = Redis(
        host=config.REDIS_HOST,
        port=config.REDIS_PORT,
        password=config.REDIS_PASSWORD,
        decode_responses=True,
    )

    delete_expired_tokens_task_scheduler = setup_tasks(app.state.session_factory)
    logger.info("DB started")

    consume_task = await setup_consume_registered_user_task(
        channel_pool=app.state.channel_pool,
        session_factory=app.state.session_factory,
    )

    yield

    consume_task.cancel()
    try:
        await consume_task
    except BaseException:
        pass

    delete_expired_tokens_task_scheduler.shutdown()

    await app.state.channel_pool.close()
    await app.state.connection_pool.close()
    await app.state.db_engine.dispose()
    await app.state.redis_client.close()

    logger.info("App stopped")
