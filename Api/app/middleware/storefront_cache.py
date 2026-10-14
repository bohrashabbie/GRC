"""Tell the storefront to drop its cached catalogue after anything changes.

The storefront caches every catalogue read (products, categories, banners,
menus, settings) so a page view costs no API round trips. Any successful
write through the admin API, and any placed order (stock and best-sellers
move), clears that cache — so the shop stays fast without serving stale
content.

The call is fire-and-forget on a background thread and coalesced: a burst of
writes (a bulk edit, a product with twenty variants) sends one request a
moment later, not twenty, and never slows the write down.
"""

from __future__ import annotations

import logging
import threading

import httpx
from fastapi import FastAPI, Request

from app.config import settings

log = logging.getLogger(__name__)

_DELAY_SECONDS = 1.0
_pending = threading.Lock()


def _send() -> None:
    _pending.release()
    try:
        httpx.post(
            settings.storefront_revalidate_url,
            headers={"x-revalidate-secret": settings.storefront_revalidate_secret},
            timeout=5,
        ).raise_for_status()
    except httpx.HTTPError as exc:
        log.warning("storefront cache not cleared: %s", exc)


def bust() -> None:
    if not settings.storefront_revalidate_url:
        return
    # Already scheduled: that request will cover this write too.
    if not _pending.acquire(blocking=False):
        return
    timer = threading.Timer(_DELAY_SECONDS, _send)
    timer.daemon = True
    timer.start()


def _changes_content(request: Request) -> bool:
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return False
    path = request.url.path
    if path.startswith("/api/v1/"):
        return not path.startswith("/api/v1/auth/")
    return path.startswith("/shop/v1/checkout")


def register(app: FastAPI) -> None:
    @app.middleware("http")
    async def clear_storefront_cache(request: Request, call_next):
        response = await call_next(request)
        if response.status_code < 400 and _changes_content(request):
            bust()
        return response
