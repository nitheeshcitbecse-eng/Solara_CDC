from typing import Any


def ok(message: str | None = None, **payload: Any) -> dict[str, Any]:
    """Every response has the shape { success, message?, ...payload } the app branches on."""
    body: dict[str, Any] = {"success": True}
    if message:
        body["message"] = message
    body.update(payload)
    return body
