from datetime import datetime, timedelta, timezone

import jwt
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from netcheck_backend.config import config
from netcheck_backend.schemas import AccessTokenData, GeneratedToken, RefreshTokenData

ALGORITHM = config.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = config.ACCESS_TOKEN_EXPIRE_MINUTES
SECRET_KEY = config.SECRET_KEY

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies if a plain password matches a hashed password

    Args:
        plain_password (str): the plain-text password to verify
        hashed_password (str): the stored password hash for compare

    Returns:
        bool: True if password matches hash, otherwise False
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_hash(password: str) -> str:
    return pwd_context.hash(password)


def generate_token(
    data: dict, expires_delta: timedelta, secret_key: str
) -> GeneratedToken:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)
    return GeneratedToken(token=encoded_jwt, expiration_time=expire)


def create_access_token(data: AccessTokenData, secret_key: str) -> GeneratedToken:
    expires_delta: timedelta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return generate_token({"sub": str(data.user_id)}, expires_delta, secret_key)


def create_refresh_token(data: RefreshTokenData, secret_key: str) -> GeneratedToken:
    expires_delta: timedelta = timedelta(days=config.REFRESH_TOKEN_EXPIRE_DAYS)
    return generate_token(
        {"sub": str(data.user_id), "jti": str(data.jti)},
        expires_delta,
        secret_key,
    )


def decode_jwt(token: str, secret_key: str):
    return jwt.decode(token, secret_key, algorithms=[ALGORITHM])


print(get_hash("adminpassword"))
