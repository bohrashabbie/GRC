"""Small in-process TTL cache for read-mostly reference data.

Why this exists
---------------
The database is remote (~219 ms round trip per statement, measured), so even a
perfectly written two-query endpoint costs half a second. Data that changes
rarely — the permission catalog, roles, options, locations, settings — does not
need to pay that on every request.

What is safe to cache here
--------------------------
Only data where a bounded staleness window is acceptable AND every writer
invalidates explicitly. Deliberately NOT cached:

  * orders, payments, stock levels, stock movements — these must always be
    read live. Serving a stale stock number is how you oversell.
  * anything cursor-paginated by (created_at, id) — the cursor is the cache
    key's real identity and hit rates would be near zero anyway.

Invalidation, not expiry, is the primary correctness mechanism. The TTL is a
backstop for anything a writer forgets, not the design.

IMPORTANT — single process only
-------------------------------
This is per-process memory. It is correct under the current deployment (one
uvicorn worker, no Redis, per CLAUDE.md). If this app is ever run with
--workers > 1 or more than one container, each process gets its own copy and
invalidation in one will not reach the others: a permission change could take
up to TTL seconds to be seen by the other workers. At that point this must move
behind Redis. `CACHE_TTL_SECONDS` is deliberately short so that failure mode
stays bounded rather than indefinite.
"""

from __future__ import annotations

import threading
import time
from typing import Any, Callable, TypeVar

T = TypeVar("T")

# Short by design: this is a latency shim, not a source of truth. Long enough
# to collapse the many reads inside one page load, short enough that a missed
# invalidation self-heals in seconds.
CACHE_TTL_SECONDS = 60.0

# Authorization data gets a tighter bound than plain reference data — a revoked
# role should stop working promptly even if some future writer forgets to call
# invalidate().
AUTHZ_TTL_SECONDS = 15.0


class _TTLCache:
    """Namespaced TTL cache.

    Thread-safe because FastAPI runs sync `def` routes in a threadpool, so
    several requests touch this concurrently. A single lock is plenty: entries
    are tiny and held only for dict access, never across a DB call.
    """

    def __init__(self) -> None:
        self._data: dict[str, dict[str, tuple[float, Any]]] = {}
        self._lock = threading.Lock()

    def get_or_set(
        self, namespace: str, key: str, ttl: float, producer: Callable[[], T]
    ) -> T:
        now = time.monotonic()
        with self._lock:
            entry = self._data.get(namespace, {}).get(key)
            if entry is not None and entry[0] > now:
                return entry[1]

        # Produced outside the lock on purpose. Two requests missing at the
        # same time will both query — a duplicated read is far cheaper than
        # holding a global lock across a 200 ms network call.
        value = producer()

        with self._lock:
            self._data.setdefault(namespace, {})[key] = (now + ttl, value)
        return value

    def invalidate(self, namespace: str, key: str | None = None) -> None:
        """Drop one key, or the whole namespace when key is None."""
        with self._lock:
            if key is None:
                self._data.pop(namespace, None)
            else:
                self._data.get(namespace, {}).pop(key, None)

    def invalidate_all(self) -> None:
        with self._lock:
            self._data.clear()

    def stats(self) -> dict[str, int]:
        with self._lock:
            return {ns: len(entries) for ns, entries in self._data.items()}


cache = _TTLCache()


# Namespaces. Keeping them as constants means an invalidation typo is an
# ImportError rather than a silently-never-invalidated cache entry.
class Namespace:
    PERMISSION_CATALOG = "permission_catalog"
    ROLES = "roles"
    USER_PERMISSIONS = "user_permissions"
    USER_GRANTS = "user_grants"
    OPTIONS = "options"
    LOCATIONS = "locations"
    SETTINGS = "settings"
    CATEGORY_TREE = "category_tree"


def invalidate_authz(user_id: int | None = None) -> None:
    """Called after anything that changes what somebody is allowed to do.

    Role and permission edits affect every user holding that role, and we do
    not track that mapping in memory, so those clear the whole namespace.
    Passing user_id only narrows it when the change is genuinely user-scoped.
    """
    if user_id is None:
        cache.invalidate(Namespace.USER_PERMISSIONS)
        cache.invalidate(Namespace.USER_GRANTS)
    else:
        cache.invalidate(Namespace.USER_PERMISSIONS, str(user_id))
        cache.invalidate(Namespace.USER_GRANTS, key=None)
    cache.invalidate(Namespace.ROLES)
