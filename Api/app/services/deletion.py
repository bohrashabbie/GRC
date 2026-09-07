"""Remove a row outright when nothing references it; deactivate it when
something does.

Hard Rule 4 exists so an order can never point at a row that vanished. It does
not require keeping rows that nothing has ever referenced — a brand created by
mistake five minutes ago is exactly what staff asked to be able to remove. So
the rule is enforced where it actually bites: each caller declares what would
be orphaned, and a row with any of those references is deactivated instead of
deleted. The caller gets back which of the two happened, and why, so the admin
can say "deactivated, 3 products still use it" rather than silently doing the
weaker thing and reporting success.

Entities with no `is_active` column (options) have no fallback, so they raise
`blocked()` instead of quietly succeeding.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.middleware.error import BusinessRuleError

DELETED = "deleted"
DEACTIVATED = "deactivated"


@dataclass(frozen=True)
class DeletionResult:
    """What actually happened, for the response body.

    blockers maps a caller-supplied label ("products", "purchase orders") to
    how many rows hold the reference. Empty whenever mode is DELETED.
    """

    mode: str
    blockers: dict[str, int] = field(default_factory=dict)

    @property
    def was_deleted(self) -> bool:
        return self.mode == DELETED


def find_blockers(db: Session, refs: Sequence[tuple[str, Any]]) -> dict[str, int]:
    """Count the rows behind each (label, SELECT) pair, keeping only non-zero.

    Counts rather than EXISTS because the number is shown to the user — "still
    used by 3 products" is actionable in a way that "still in use" is not.
    """
    found: dict[str, int] = {}
    for label, stmt in refs:
        count = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
        if count:
            found[label] = count
    return found


def blocked(
    entity: str, blockers: dict[str, int], samples: Sequence[str] | None = None
) -> BusinessRuleError:
    """For entities that cannot be deactivated as a fallback.

    `samples` names a few of the rows in the way. A count says staff are stuck;
    the names say where to go and undo it.
    """
    detail = ", ".join(f"{count} {label}" for label, count in blockers.items())
    message = f"This {entity} is still referenced by {detail}, so it cannot be removed."
    if samples:
        message += " In the way: " + ", ".join(samples) + "."
    return BusinessRuleError(
        message,
        code="delete_blocked",
        details={"blockers": blockers, "samples": list(samples) if samples else []},
    )
