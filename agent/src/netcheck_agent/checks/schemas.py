from pydantic import BaseModel


class HttpResult(BaseModel):
    status_code: int | None = None
    headers: dict[str, str] | None = None
    redirected: bool | None = None
    final_url: str | None = None
    content_length: int | None = None
    content_sample: str | None = None
    ssl_expiry_days: int | None = None
