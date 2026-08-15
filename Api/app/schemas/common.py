"""Response shapes shared across domains."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class DeletionResultOut(BaseModel):
    """Returned by every DELETE that removes the row when it can and falls back
    to deactivating it when something still references it.

    `blockers` maps what holds the reference to how many rows do, so the admin
    can explain the fallback instead of just reporting success.
    """

    mode: Literal["deleted", "deactivated"]
    blockers: dict[str, int] = {}
