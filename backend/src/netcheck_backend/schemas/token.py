from datetime import datetime
from pydantic import BaseModel, UUID4


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class AccessTokenData(BaseModel):
    user_id: UUID4


class RefreshTokenData(BaseModel):
    user_id: UUID4
    jti: UUID4


class GeneratedToken(BaseModel):
    token: str
    expiration_time: datetime


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
