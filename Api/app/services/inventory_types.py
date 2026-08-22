"""Location types — the vocabulary behind locations.type.

Kept beside the other staff-managed vocabularies in shape and behaviour: the
code is derived from the label, the count of places using a type is on the
list, and deleting one still in use is refused rather than silently stranding
those places.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.middleware.error import BusinessRuleError, ConflictError, NotFoundError
from app.models.inventory import Location, LocationType, LocationTypeTranslation
from app.services import audit_service, deletion
from app.services.catalog_service import _auto_label_code, _sync_label_translations


def list_location_types(db: Session, *, is_active: bool | None = None) -> list[LocationType]:
    stmt = (
        select(LocationType)
        .options(selectinload(LocationType.translations))
        .order_by(LocationType.sort_order, LocationType.id)
    )
    if is_active is not None:
        stmt = stmt.where(LocationType.is_active.is_(is_active))
    types = list(db.execute(stmt).scalars().all())
    attach_location_type_counts(db, types)
    return types


def attach_location_type_counts(db: Session, types: list[LocationType]) -> None:
    rows = db.execute(
        select(Location.type, func.count()).group_by(Location.type)
    ).all()
    counts = {code: count for code, count in rows}
    for location_type in types:
        location_type.location_count = counts.get(location_type.code, 0)


def get_location_type(db: Session, location_type_id: int) -> LocationType:
    location_type = db.get(
        LocationType, location_type_id, options=[selectinload(LocationType.translations)]
    )
    if location_type is None:
        raise NotFoundError("Location type not found")
    attach_location_type_counts(db, [location_type])
    return location_type


def create_location_type(db: Session, data) -> LocationType:
    code = data.code.strip() if data.code else _auto_label_code(db, LocationType, data.translations, "type")
    existing = db.execute(select(LocationType).where(LocationType.code == code)).scalar_one_or_none()
    if existing is not None:
        raise ConflictError(
            f"A location type with code '{code}' already exists.",
            code="duplicate_location_type_code",
        )
    location_type = LocationType(code=code, sort_order=data.sort_order, is_active=data.is_active)
    db.add(location_type)
    db.flush()
    _sync_label_translations(
        db, [], data.translations, "location_type_id", location_type.id, LocationTypeTranslation
    )
    db.commit()
    db.refresh(location_type)
    attach_location_type_counts(db, [location_type])
    return location_type


def update_location_type(db: Session, location_type_id: int, data) -> LocationType:
    location_type = get_location_type(db, location_type_id)
    fields = data.model_dump(exclude_unset=True, exclude={"translations"})
    for field, value in fields.items():
        if value is not None:
            setattr(location_type, field, value)
    if data.translations is not None:
        _sync_label_translations(
            db,
            list(location_type.translations),
            data.translations,
            "location_type_id",
            location_type.id,
            LocationTypeTranslation,
        )
    db.commit()
    db.refresh(location_type)
    attach_location_type_counts(db, [location_type])
    return location_type


def delete_location_type(db: Session, location_type_id: int, *, actor_user_id: int | None) -> deletion.DeletionResult:
    """Remove a type nothing uses; refuse while places still have it.

    locations.type is text, so deleting one in use would leave those places
    filed under a type the admin can no longer show.
    """
    location_type = get_location_type(db, location_type_id)
    before = {"code": location_type.code, "is_active": location_type.is_active}
    blockers = deletion.find_blockers(
        db,
        [("locations", select(Location.id).where(Location.type == location_type.code))],
    )
    if blockers:
        raise deletion.blocked("location type", blockers)

    db.delete(location_type)
    audit_service.record(
        db,
        actor_user_id=actor_user_id,
        action=f"location_type.{deletion.DELETED}",
        entity_type="location_type",
        entity_id=location_type_id,
        before=before,
        after=None,
    )
    db.commit()
    return deletion.DeletionResult(deletion.DELETED, {})


def active_location_type_codes(db: Session) -> set[str]:
    return {
        row[0]
        for row in db.execute(
            select(LocationType.code).where(LocationType.is_active.is_(True))
        ).all()
    }



def _assert_known_location_type(db: Session, type_code: str) -> None:
    codes = active_location_type_codes(db)
    if type_code not in codes:
        raise BusinessRuleError(
            f"Unknown location type '{type_code}'.",
            code="unknown_location_type",
            details={"allowed": sorted(codes)},
        )
