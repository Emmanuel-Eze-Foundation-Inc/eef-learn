"""asyncpg pool shared by the API and the job worker."""

from urllib.parse import parse_qs, urlparse

import asyncpg

_pool: asyncpg.Pool | None = None


def _pool_ssl(database_url: str) -> bool:
    parsed = urlparse(database_url)
    sslmode = parse_qs(parsed.query).get("sslmode", [""])[-1]
    host = parsed.hostname or ""
    if sslmode in {"require", "verify-ca", "verify-full"}:
        return True
    return host.endswith(".amazonaws.com") or "heroku" in host


async def get_pool(database_url: str) -> asyncpg.Pool:
    global _pool
    if _pool is None:
        kwargs: dict = {"dsn": database_url, "min_size": 1, "max_size": 5}
        if _pool_ssl(database_url):
            kwargs["ssl"] = True
        _pool = await asyncpg.create_pool(**kwargs)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
