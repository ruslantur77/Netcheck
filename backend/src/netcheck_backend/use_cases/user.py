from netcheck_backend.schemas.user import (
    UserAuth,
    UserResponse,
)
from netcheck_backend.security import verify_password
from netcheck_backend.services import UserService


class AuthUseCase:
    def __init__(self, user_service: UserService) -> None:
        self.user_service = user_service

    async def execute(self, data: UserAuth) -> UserResponse | None:
        """Authenticates a user using email and password.

        Args:
            data (AuthUserRequest): User's credentials

        Returns:
            UserResponse | None: Authenticated user object if successful, None otherwise
        """
        user = await self.user_service.get_by_email(data.email)
        if not user:
            return None
        if not verify_password(data.password, user.hashed_password):
            return None

        return UserResponse.model_validate(user, from_attributes=True)
