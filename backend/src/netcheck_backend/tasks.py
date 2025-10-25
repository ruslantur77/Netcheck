import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from netcheck_backend.models import RefreshTokensOrm

logger = logging.getLogger(__name__)


async def delete_expired_tokens(session_factory: async_sessionmaker[AsyncSession]):
    async with session_factory() as session:
        try:
            stmt = delete(RefreshTokensOrm).where(
                RefreshTokensOrm.expires_at <= datetime.now(timezone.utc)
            )
            result = await session.execute(stmt)
            await session.commit()
            logger.info(f"Deleted {result.rowcount} expired tokens")
        except Exception as e:
            logger.error("Error deleting tokens", exc_info=e)
            await session.rollback()


def setup_delete_expired_tokens_task(session_factory: async_sessionmaker):
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        delete_expired_tokens,
        "interval",
        hours=3,
        args=[session_factory],
        next_run_time=datetime.now(timezone.utc),
    )
    scheduler.start()
    return scheduler


def setup_tasks(session_factory: async_sessionmaker):
    delete_expired_tokens_task_scheduler = setup_delete_expired_tokens_task(
        session_factory
    )
    return delete_expired_tokens_task_scheduler
