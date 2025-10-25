from fastapi import FastAPI

from netcheck_backend.api import agents_router, auth_router, check_router
from netcheck_backend.exception_handler import exception_handler
from netcheck_backend.exceptions import AppException
from netcheck_backend.logger import setup_logger
from netcheck_backend.startup_init import startup_event

setup_logger()


app = FastAPI(
    lifespan=startup_event,
    swagger_ui_parameters={
        "tryItOutEnabled": True,
        "withCredentials": True,
    },
)
app.include_router(auth_router)
app.include_router(agents_router)
app.include_router(check_router)

app.add_exception_handler(AppException, exception_handler)
