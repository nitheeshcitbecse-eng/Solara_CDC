import asyncio

import httpx

from app import keep_awake


def test_only_active_on_render(monkeypatch):
    monkeypatch.delenv("RENDER_EXTERNAL_URL", raising=False)
    assert keep_awake.keep_awake_url() is None
    monkeypatch.setenv("RENDER_EXTERNAL_URL", "https://solara-cdc.onrender.com/")
    assert keep_awake.keep_awake_url() == "https://solara-cdc.onrender.com/api/v1/health"


def test_pings_itself_on_schedule(monkeypatch):
    calls = []

    def handler(request):
        calls.append(str(request.url))
        return httpx.Response(200, json={"success": True})

    real_client = httpx.AsyncClient
    monkeypatch.setattr(keep_awake.httpx, "AsyncClient", lambda timeout: real_client(transport=httpx.MockTransport(handler)))
    monkeypatch.setenv("RENDER_EXTERNAL_URL", "https://solara-cdc.onrender.com")
    monkeypatch.setenv("KEEP_AWAKE_MINUTES", str(0.05 / 60))  # every 50 ms for the test

    async def run():
        async with keep_awake.keep_awake():
            await asyncio.sleep(0.2)

    asyncio.run(run())
    assert len(calls) >= 2 and set(calls) == {"https://solara-cdc.onrender.com/api/v1/health"}


def test_failed_ping_does_not_crash():
    def handler(request):
        raise httpx.ConnectError("down")

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await keep_awake.ping(client, "https://example.invalid/api/v1/health")

    assert asyncio.run(run()) is False
