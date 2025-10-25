from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from netcheck_backend.config import config
from netcheck_backend.schemas import (
    AccessTokenData,
    RefreshTokenData,
    UserAuth,
)
from netcheck_backend.security import decode_jwt, oauth2_scheme
from netcheck_backend.services import RefreshTokenService, UserService


def get_async_session_factory(req: Request):
    return req.app.state.session_factory  # type: ignore


def get_channel_pool(req: Request):
    return req.app.state.channel_pool  # type: ignore


def get_user_service(
    session_factory: Annotated[
        async_sessionmaker[AsyncSession], Depends(get_async_session_factory)
    ],
) -> UserService:
    return UserService(session_factory)


def get_token_service(
    session_factory: Annotated[
        async_sessionmaker[AsyncSession], Depends(get_async_session_factory)
    ],
) -> RefreshTokenService:
    return RefreshTokenService(session_factory)


def get_refresh_token_from_cookies(request: Request):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token"
        )
    return refresh_token


def get_secret_key():
    return config.SECRET_KEY


def get_access_token_data(
    token: Annotated[str, Depends(oauth2_scheme)],
    secret_key: Annotated[str, Depends(get_secret_key)],
) -> AccessTokenData:
    try:
        payload = decode_jwt(token, secret_key)
        id = payload.get("sub")
        if id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token structure",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token_data = AccessTokenData(user_id=id)
        return token_data
    except jwt.exceptions.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.exceptions.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_refresh_token_data(
    token: Annotated[str, Depends(get_refresh_token_from_cookies)],
    secret_key: Annotated[str, Depends(get_secret_key)],
) -> RefreshTokenData:
    try:
        payload = decode_jwt(token, secret_key)
        user_id = payload.get("sub")
        jti = payload.get("jti")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token structure",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token_data = RefreshTokenData(user_id=user_id, jti=jti)
        return token_data
    except jwt.exceptions.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.exceptions.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_auth_data(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    try:
        return UserAuth(email=form_data.username, password=form_data.password)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.errors()
        )
