from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from netcheck_backend.config import config
from netcheck_backend.dependencies import (
    get_auth_data,
    get_refresh_token_data,
    get_secret_key,
    get_token_service,
    get_user_service,
)
from netcheck_backend.schemas import (
    ErrorResponse,
    RefreshTokenData,
    TokenResponse,
    UserAuth,
)
from netcheck_backend.services import RefreshTokenService, UserService
from netcheck_backend.use_cases import (
    AuthUseCase,
    CreateTokenPairUseCase,
    RefreshTokenPairUseCase,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def set_token_to_cookie(response: Response, new_refresh_token: str):
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=config.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/auth",
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Incorrect username or password",
        },
    },
)
async def login(
    response: Response,
    auth_data: Annotated[UserAuth, Depends(get_auth_data)],
    user_service: Annotated[UserService, Depends(get_user_service)],
    token_service: Annotated[RefreshTokenService, Depends(get_token_service)],
    secret_key: Annotated[str, Depends(get_secret_key)],
) -> TokenResponse:
    auth_uc = AuthUseCase(user_service)
    token_uc = CreateTokenPairUseCase(token_service, user_service)
    user = await auth_uc.execute(auth_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token_pair = await token_uc.execute(user_id=user.id, secret_key=secret_key)
    if token_pair is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    set_token_to_cookie(response, token_pair.refresh_token)
    return TokenResponse(
        access_token=token_pair.access_token,
        token_type="bearer",
    )


@router.post("/refresh")
async def refresh_token(
    response: Response,
    user_service: Annotated[UserService, Depends(get_user_service)],
    token_service: Annotated[RefreshTokenService, Depends(get_token_service)],
    refresh_token_data: Annotated[RefreshTokenData, Depends(get_refresh_token_data)],
    secret_key: Annotated[str, Depends(get_secret_key)],
):
    token_uc = RefreshTokenPairUseCase(
        token_service=token_service, user_service=user_service
    )

    token_pair = await token_uc.execute(
        token_data=refresh_token_data, secret_key=secret_key
    )
    if token_pair is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    set_token_to_cookie(response, token_pair.refresh_token)
    return TokenResponse(
        access_token=token_pair.access_token,
        token_type="bearer",
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    token_service: Annotated[RefreshTokenService, Depends(get_token_service)],
    refresh_token_data: Annotated[RefreshTokenData, Depends(get_refresh_token_data)],
):
    if refresh_token_data:
        await token_service.revoke_token(refresh_token_data.jti)

    response.delete_cookie(key="refresh_token", path="/api/auth")
