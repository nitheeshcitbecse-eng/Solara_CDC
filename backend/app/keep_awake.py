"""Keeps a free Render service from going to sleep.

Render's free plan stops a service after 15 minutes without incoming requests, and the next visitor then
waits up to a minute. While the service runs, it calls its own public address every few minutes; that
request arrives through Render like any visitor's, so the service never reaches 15 idle minutes.

Only active on Render (RENDER_EXTERNAL_URL is set there automatically). KEEP_AWAKE_MINUTES=0 turns it off.
One always-on free service uses ~744 of Render's 750 free hours a month.
"""

import asyncio
import contextlib
import logging
import os

import httpx

log = logging.getLogger("solara.keep_awake")


def keep_awake_url() -> str | None:
    base = os.getenv("RENDER_EXTERNAL_URL", "").rstrip("/")
    return f"{base}/api/v1/health" if base else None


def interval_seconds() -> float:
    return float(os.getenv("KEEP_AWAKE_MINUTES", "10")) * 60


async def ping(client: httpx.AsyncClient, url: str) -> bool:
    try:
        response = await client.get(url)
        return response.status_code == 200
    except httpx.HTTPError as exc:
        log.warning("Keep-awake ping failed: %r", exc)
        return False


async def _loop(url: str, every: float) -> None:
    async with httpx.AsyncClient(timeout=60) as client:
        while True:
            await asyncio.sleep(every)
            await ping(client, url)


@contextlib.asynccontextmanager
async def keep_awake():
    """Runs the ping loop for as long as the app runs."""
    url, every = keep_awake_url(), interval_seconds()
    if not url or every <= 0:
        yield
        return
    log.info("Keep-awake: pinging %s every %.0f minutes", url, every / 60)
    task = asyncio.create_task(_loop(url, every))
    try:
        yield
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
