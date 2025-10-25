import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse

from netcheck_backend.exceptions import AlreadyExistsError, NotFoundError

logger = logging.getLogger(__name__)


def exception_handler(request: Request, exc: Exception):
    match exc:
        case AlreadyExistsError():
            return JSONResponse(
                content=str(exc),
                status_code=status.HTTP_409_CONFLICT,
            )
        case NotFoundError():
            return JSONResponse(
                content=str(exc),
                status_code=status.HTTP_404_NOT_FOUND,
            )
        case _:
            logger.error("Unexpected api error:", exc_info=exc)
            return JSONResponse(
                content="Unexpected error",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
