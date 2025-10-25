from pydantic import BaseModel


class HttpResult(BaseModel):
    status_code: int | None = None
    headers: dict[str, str] | None = None
    redirected: bool | None = None
    final_url: str | None = None
    content_length: int | None = None
    content_sample: str | None = None
    ssl_expiry_days: int | None = None


class DnsResult(BaseModel):
    a_records: list[str] | None = None
    aaaa_records: list[str] | None = None
    mx_records: list[str] | None = None
    ns_records: list[str] | None = None
    txt_records: list[str] | None = None
    error: str | None = None


class PingResult(BaseModel):
    latency_ms: float | None = None
    error: str | None = None


class TcpResult(BaseModel):
    success_connect: bool | None = None
    error: str | None = None
