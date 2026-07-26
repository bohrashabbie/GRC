# Fixture layer — temporary, delete when `/shop/v1` exists

The storefront API does not exist yet. `Api/` currently exposes only the admin
surface at `/api/v1`, and the tables these screens need — `banners`,
`collections`, `menus`, `pages`, `carts`, `reviews`, `wishlists`,
`shipping_*`, `coupons` — have no models and no migrations.

Rather than scatter placeholder data through components, every read goes
through `src/lib/shop-api.ts`, which checks `NEXT_PUBLIC_USE_FIXTURES` and
either fetches `/shop/v1` or returns a fixture from this folder. The fixtures
are typed with the real contract in `src/types/shop.ts`, so they cannot drift
from the shape the UI expects.

## Removal checklist

When the backend lands:

1. Reconcile `src/types/shop.ts` against the real responses. Fix mismatches
   there, not in components.
2. Set `NEXT_PUBLIC_USE_FIXTURES=false` in `.env.local` and confirm every page
   still renders.
3. Delete `src/mocks/` and the `USE_FIXTURES` branch in `src/lib/shop-api.ts`.
4. Delete `public/fixtures/` and remove `NEXT_PUBLIC_USE_FIXTURES` from
   `.env.example`.

Step 3 should be a single commit that touches no component file. If it does
touch one, a fixture leaked out of this boundary and that is the bug.

## What the fixtures deliberately do *not* fake

- **Prices are not computed anywhere.** Fixture products carry server-shaped
  price strings. No component multiplies, sums, or applies VAT.
- **No cart totals.** Cart maths is entirely server-side; faking it would
  invite a client-side implementation that later has to be torn out.
