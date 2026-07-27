# CLAUDE.md

This file is context for Claude Code across sessions. Read it before making any structural, schema, or convention decision. If something here conflicts with a specific instruction in the current chat, ask — don't silently pick one.

## What this project is

**GR8** — Saudi men's traditional-wear ecommerce, thobes-focused. Bilingual
Arabic/English, Arabic default, RTL primary layout. Originally scaffolded as an
"AlShiaka clone", then renamed to GRC, and renamed again to GR8 on 2026-07-27.
The catalog is thobes only. Two repos, siblings, not nested:

```
dumbstack/GRC/
├── Api/       — FastAPI backend (this file's main concern)
├── admin/     — Next.js admin frontend, consumes Api/ over /api/v1
└── media/     — source product photography used to seed the catalog
```

Note the frontend folder is lowercase `admin/` — npm rejects capitals in
package names and Windows would not release the handle to rename it. Windows
paths are case-insensitive, so `Admin/` resolves to the same directory.

The repo folder is still `dumbstack/GRC/`, and infrastructure identifiers still
say `grc` on purpose: the Postgres db/user, the Compose project name
`grc-commerce`, the `grc` system user in `Api/Dockerfile`, the `grc_refresh`
cookie and the `grc.*` localStorage keys. Only the visible branding was renamed
to GR8. Renaming `POSTGRES_DB`/`POSTGRES_USER` would break an existing
deployment — those apply only when the `postgres_data` volume is first
initialised — so leave them unless you are also wiping the volume.

Branding lives in `admin/messages/{ar,en}.json` under `app.name` / `app.shortName`,
and the logo is `admin/public/logo-mark.svg` (+ `favicon.svg`). Replacing that one
SVG re-brands the sidebar, login screen and browser tab together.

**Current phase: Admin panel only.** No storefront, no checkout, no cart, no public shop endpoints, no CMS (pages/posts/banners/menus), no coupons, no ZATCA invoicing yet. Those come later as separate, explicitly-scoped phases — do not build ahead into them without being asked.

## Source of truth for the schema

`Api/alshiaka_clone_schema.xlsx` — two sheets, `Storefront Schema` (70 tables) and `Admin Schema` (26 tables). Every column has its Postgres type, nullability, key role (PK/FK/UQ/IDX), and a definition explaining *why* it exists, not just what it's called. When in doubt about a column's purpose, read the definition there before guessing.

**This build uses a scoped subset — not all 96 tables.** The full `Admin Schema` sheet (26 tables) plus these tables from `Storefront Schema` because the admin manages them directly:

`media, brands, brand_translations, categories, category_translations, products, product_translations, product_media, product_categories, options, option_translations, option_values, option_value_translations, variants, variant_option_values, variant_media, attributes, attribute_translations, product_attributes, orders, order_items, order_addresses, order_status_history, order_notes, payments, payment_refunds, shipments, shipment_items, returns, return_items, customers, customer_addresses, store_locations, carriers, tax_rates, regions`

`regions` was added because `customer_addresses.region_id` is a hard FK to it. If a table outside this list seems needed, flag it before adding it rather than expanding scope silently.

Explicitly **out of scope** for this backend right now: `carts, cart_items, cart_discounts, checkout_sessions, stock_reservations, customer_sessions, verification_tokens, wishlists, wishlist_items, newsletter_subscribers, collections*, related_products, reviews, coupons*, discount_rules, shipping_zones, shipping_methods, shipping_rates, pages*, posts*, banners*, menus*, redirects, invoices`.

## Environment

- Local Postgres 16 running in Docker (`alshiaka-postgres` container, port 5432, db `alshiaka_admin`, user/pass `postgres`/`postgres`). No native Postgres install on this machine — always assume Docker unless told otherwise.
- Python 3.11+, plain `venv`, `requirements.txt`. **No `uv`, no poetry.** Keep dependency management as plain as possible.
- No Redis, no `arq`/Celery worker, no R2/S3 at this stage. Media uploads go to local `./uploads`. The storage-writing code is isolated behind one function/module so swapping to R2 later is a one-file change, not a rewrite.
- Sync SQLAlchemy (`psycopg`, not `asyncpg`). Deliberate choice — async adds complexity this 2-vCPU-scale project doesn't need yet. FastAPI's threadpool handles sync `def` routes fine.

## Project structure — keep it flat, resist adding layers

```
Api/
├── requirements.txt
├── .env.example / .env
├── alembic.ini
├── migrations/{env.py, versions/}
├── app/
│   ├── main.py            # FastAPI app, mounts api_router, CORS, exception handlers
│   ├── api.py              # aggregates every router into one APIRouter
│   ├── config.py           # pydantic-settings Settings
│   ├── database.py         # engine, SessionLocal, Base, get_db()
│   ├── security.py         # JWT create/decode, token hashing
│   ├── deps.py              # get_current_user, will hold require() permission dep
│   ├── errors.py            # AppError hierarchy + exception handlers (see below)
│   ├── utils.py              # money helpers, arabic normalisation, slugify, pagination
│   ├── permissions.py        # every permission key + the 8 default roles, one file
│   ├── models/                # SQLAlchemy models, grouped by domain, NOT one file per table
│   │   ├── base.py, auth.py, catalog.py, inventory.py, purchasing.py,
│   │   │   orders.py, customers.py, system.py
│   ├── schemas/                # Pydantic Create/Update/Read per resource, grouped by domain
│   ├── services/                # business logic + transaction boundaries
│   ├── routers/                  # thin — parse request, call service, return schema
│   └── seed.py                   # python -m app.seed
└── tests/
```

**No `repositories/` layer, no `src/` wrapper, no `core/` subfolder.** These were deliberately cut for simplicity — don't reintroduce them without being asked. Services query the DB directly.

**Split a file only when it's actually gotten big** (roughly 300+ lines) — not preemptively.

## Non-negotiable rules — apply these without being re-reminded

1. **Money is `NUMERIC(12,2)` SAR, VAT-inclusive on customer-facing values, never `float`.** VAT rate is `NUMERIC(5,4)` stored as a fraction (`0.1500`, not `15`).
2. **`stock_levels.on_hand` is written ONLY through `inventory_service.py`, and only alongside a `stock_movements` row in the same transaction.** No router, no other service, touches `stock_levels` directly. The raw update function is private to that module. `stock_movements` is the ledger and the actual source of truth; `on_hand` is a cached projection.
3. **Stock decrements use `SELECT ... FOR UPDATE`, locking by `variant_id` ascending**, to avoid deadlocks under concurrent orders.
4. **Nothing is ever hard-deleted if an order could reference it.** Use `is_active` / `discontinued_at` / `revoked_at`. `DELETE` endpoints call the service's soft-delete, never `session.delete()`.
5. **A product always has at least one variant.** No "has variants" branch anywhere in the code. Simple products get one default variant created automatically on product creation.
6. **Variant combinations are created explicitly, never as a full cartesian product.** Reject any request that would create more than 300 variants for one product, with a clear error including the attempted count.
7. **Order lines snapshot everything at purchase time** — `sku_snapshot`, `name_snapshot`, `options_snapshot`, `unit_price_snapshot`, `tax_rate_snapshot`. Nothing customer/invoice-facing may join to live catalog tables to reproduce a historical figure.
8. **Every write to orders, payments, prices, roles, or permissions writes `audit_log`** with only the changed fields in `before_json`/`after_json`, via `audit_service`.
9. **Translations are rows in `*_translations` tables keyed by `locale`**, never JSON blobs, never separate `name_ar`/`name_en` columns. Slugs are unique **per locale**.
10. **RBAC is enforced with a `require("permission.key")` FastAPI dependency** (in `deps.py`), checked location-scoped wherever `user_roles.location_id` is set. Permission keys live in `permissions.py` — never invent one inline in a router; add it there first.
11. **Layering is real, not decorative:** routers parse + call a service + return a schema, nothing else. Services own transactions and business rules. Models are just SQLAlchemy classes with no logic. No query-building inside a router file.
12. **List endpoints are cursor-paginated on `(created_at, id)`. Never `OFFSET`.** Response shape: `{"items": [...], "next_cursor": "opaque-string-or-null"}`.
13. **No MFA for now.** `users.mfa_secret` and `user_sessions.mfa_satisfied` columns exist in the schema but are intentionally unused. Auth is plain bearer: login → access + refresh token pair, no second factor. Don't add MFA flows back without being asked — this was a deliberate simplification for local development with a single owner account, revisit only when real multi-staff, internet-facing deployment is imminent.

## Error handling contract

Every error response, whatever raised it, is normalized to:

```json
{"code": "string", "message": "string", "details": {...} | null}
```

Implemented in `app/errors.py` via `register_exception_handlers(app)`, called once from `main.py`. Services and routers raise `AppError` subclasses (`NotFoundError`, `ValidationAppError`, `ConflictError`, `PermissionDeniedError`, `AuthenticationError`, `BusinessRuleError`) — never a bare `HTTPException`. `RequestValidationError`, `IntegrityError`, generic `SQLAlchemyError`, and any unhandled `Exception` all get caught and wrapped so nothing leaks a raw traceback or FastAPI's default error shape.

Use `code` values the frontend can branch on: `insufficient_stock`, `variant_limit_exceeded`, `permission_denied`, etc. — not generic strings.

## Auth flow (current, simplified)

- `POST /auth/login` → `{access_token, refresh_token, token_type}`, no MFA branch
- `POST /auth/refresh` → rotates the refresh token (old one revoked, new session issued)
- `POST /auth/logout` → revokes the session by refresh token
- `GET /auth/me` → current user + resolved roles + flattened permission keys
- Refresh tokens are stored **hashed** (`SHA-256`) in `user_sessions.refresh_token_hash`, never in plaintext
- Access tokens are short-lived JWTs decoded in `deps.get_current_user`; failed/expired/malformed → `AuthenticationError`

## Admin frontend (Next.js) conventions

- Next.js 15 App Router, TypeScript, Tailwind + shadcn/ui, `next-intl` for AR/EN + RTL, TanStack Query for all server state, TanStack Table for grids, `react-hook-form` + `zod` for forms
- Bearer token in memory, refresh token in an httpOnly-equivalent cookie via a route handler — never both tokens in plain client-accessible storage
- Permission-driven UI (`usePermission()`, `<RequirePermission>`) is **cosmetic only** — the backend's `require()` dependency is the actual security boundary. The frontend hiding a button is convenience, not enforcement.
- Error toasts / inline errors keyed off the backend's `{code, message, details}` envelope, not generic messages

## Build order convention

Work is broken into small groups (roughly: auth/identity → catalog structure → products/variants → inventory → purchasing → orders/customers → settings/audit), each one built, tested against the real local Postgres/API, and confirmed before moving to the next. Don't jump ahead to a later group's endpoints or pages while an earlier group has open gaps — say so instead of quietly building around a hole.

## When something here seems wrong

If a rule in this file makes a specific task harder, or the schema workbook seems to disagree with something here, say so before implementing a workaround. Fix the design, don't route around it silently — a correct earlier decision (like the ones above) should not get quietly reversed because a later task made it inconvenient.