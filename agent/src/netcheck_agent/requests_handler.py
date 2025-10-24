from rmq_service import ProduceService


async def callback(producer: ProduceService, data: bytes, **kwargs):
    pass
