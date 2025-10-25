from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from netcheck_backend.config import config
from netcheck_backend.models import Base


async def create_tables(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def init_database():
    engine = create_async_engine(
        config.DB_URL,
        echo=False,
        pool_size=10,
        max_overflow=20,
        future=True,
    )

    AsyncSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    await create_tables(engine)

    return engine, AsyncSessionLocal
