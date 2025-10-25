class AppException(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)


class NotFoundError(AppException):
    pass


class AlreadyExistsError(AppException):
    pass
