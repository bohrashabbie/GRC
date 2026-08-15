"""Seed permissions, the 8 default roles, one owner user, and default settings.

Run with: python -m app.seed
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

from app.database import SessionLocal
from app.middleware.security import hash_password
from app.models.auth import Permission, Role, RolePermission, User, UserRole
from app.models.system import Setting
from app.permissions import DEFAULT_ROLES, PERMISSIONS, ROLE_PERMISSIONS

OWNER_EMAIL = os.getenv("OWNER_EMAIL", "owner@alshiaka.sa").strip().lower()
OWNER_PASSWORD = os.getenv("OWNER_PASSWORD", "")


def seed_permissions(db) -> dict[str, Permission]:
    existing = {p.key: p for p in db.query(Permission).all()}
    for pdef in PERMISSIONS:
        if pdef.key in existing:
            continue
        perm = Permission(
            key=pdef.key, group=pdef.group, description=pdef.description, is_dangerous=pdef.is_dangerous
        )
        db.add(perm)
        existing[pdef.key] = perm
    db.flush()
    return existing


def seed_roles(db) -> dict[str, Role]:
    existing = {r.code: r for r in db.query(Role).all()}
    for rdef in DEFAULT_ROLES:
        if rdef["code"] in existing:
            continue
        role = Role(**rdef)
        db.add(role)
        existing[rdef["code"]] = role
    db.flush()
    return existing


def seed_role_permissions(db, roles: dict[str, Role], permissions: dict[str, Permission]) -> None:
    existing_pairs = {(rp.role_id, rp.permission_id) for rp in db.query(RolePermission).all()}
    now = datetime.now(timezone.utc)
    for role_code, perm_keys in ROLE_PERMISSIONS.items():
        role = roles[role_code]
        for key in perm_keys:
            perm = permissions[key]
            if (role.id, perm.id) in existing_pairs:
                continue
            db.add(RolePermission(role_id=role.id, permission_id=perm.id, granted_at=now))


def seed_owner_user(db, owner_role: Role) -> None:
    if db.query(User).filter(User.email == OWNER_EMAIL).first():
        return
    if not OWNER_PASSWORD:
        raise RuntimeError("Set OWNER_PASSWORD before running the seed command.")
    user = User(
        email=OWNER_EMAIL,
        password_hash=hash_password(OWNER_PASSWORD),
        full_name="Owner",
        is_active=True,
    )
    db.add(user)
    db.flush()
    db.add(
        UserRole(
            user_id=user.id,
            role_id=owner_role.id,
            location_id=None,
            granted_at=datetime.now(timezone.utc),
        )
    )
    print(f"Seeded owner user: {OWNER_EMAIL}")


# key -> (default value, group, is_public)
#
# Seeded so the settings page has a row to edit: the admin lists existing keys
# and PATCHes them, with no way to invent one. Existing values are never
# overwritten — re-running the seed must not reset a staff-set figure.
DEFAULT_SETTINGS: dict[str, tuple[object, str, bool]] = {
    # Shown in the storefront footer for the registered business.
    "store.cr_number": ("", "store", True),
    "store.vat_number": ("", "store", True),
    # Read by checkout_service on every order.
    "shipping.free_threshold": (200, "shipping", True),
    "shipping.rate.standard": ("25.000", "shipping", True),
    "shipping.rate.express": ("45.000", "shipping", True),
    "shipping.rate.pickup": ("0.000", "shipping", True),
    # Kuwait levies no VAT; this exists so a future rate needs no deploy.
    "tax.country_code": ("KW", "tax", False),
    "tax.default_rate": ("0", "tax", False),
}


def seed_settings(db) -> None:
    created = 0
    for key, (value, group, is_public) in DEFAULT_SETTINGS.items():
        if db.get(Setting, key) is not None:
            continue
        db.add(Setting(key=key, value=value, group=group, is_public=is_public))
        created += 1
    print(f"Seeded {created} new setting(s); existing values left untouched.")


def run() -> None:
    db = SessionLocal()
    try:
        permissions = seed_permissions(db)
        roles = seed_roles(db)
        seed_role_permissions(db, roles, permissions)
        seed_owner_user(db, roles["owner"])
        seed_settings(db)
        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
