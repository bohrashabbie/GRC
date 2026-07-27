# GR8 storefront

Public customer-facing site. Separate app from `admin/` — different audience,
different auth, different design goals.

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3100
```

Port 3100, so it can run alongside the admin on 3000.

| Route | What it is |
| --- | --- |
| `/{locale}` | Homepage — hero, category tiles, two product rails, promo banner |
| `/{locale}/c` | Department index |
| `/{locale}/c/[slug]` | Category listing — facets, sort, cursor "load more" |
| `/{locale}/p/[slug]` | Product detail — gallery, variants, reviews, related |
| `/{locale}/search?q=` | Search results |
| `/{locale}/cart` · `/checkout` · `/checkout/confirmation` | Cart and checkout |
| `/{locale}/account/*` | Orders, order detail, addresses, wishlist, profile, login, register |
| `/{locale}/stores` | Store locator |
| `/{locale}/pages/[slug]` | Static pages (10 of them) |
| `/{locale}/design` | Design specimen. Internal; `noindex`. Delete before launch. |

Switch locale from the top bar. Every page must be reviewed in both — a page
that only reads correctly in one direction is not finished.

## Build status

All seven groups are built. Everything runs against the fixture layer, because
the storefront API still does not exist — see below.

- [x] **1** — Shell: header, mega menu, mobile drawer, search, bottom nav,
      footer, USP strip, locale switching, RTL, design tokens
- [x] **2** — Homepage: hero carousel, category tiles, two rails, promo banner
- [x] **3** — PLP: swatch/checkbox/range facets in the URL, sort, load more
- [x] **4** — PDP: colour-filtered gallery, variant guard, accordion, reviews
- [x] **5** — Cart drawer + full cart + 4-step checkout + confirmation
- [x] **6** — Account: orders, order timeline, addresses, wishlist, profile, auth
- [x] **7** — Static pages, store locator, reviews

### What is UI-only until the backend lands

These render and validate, but do not persist, because the tables do not exist:

| Surface | Missing |
| --- | --- |
| Wishlist heart | `wishlists`, `wishlist_items` — local state, forgets on reload |
| Sign in / register | `customer_sessions` — validates, never authenticates |
| Profile / password | no `PATCH /account/profile` |
| Address add/edit | no address write endpoints — cards are read-only |
| Newsletter | `newsletter_subscribers` — the form posts nowhere |
| Payment | no gateway — a stubbed 1.8s "processing" then success |

Everything else — catalogue, cart maths, checkout, orders — is real logic
running against fixture data.

## The API does not exist yet

`Api/` exposes only the admin surface at `/api/v1`. Nothing is mounted at
`/shop/v1`, and most tables these screens need have no models.

`src/types/shop.ts` is this app's **proposal** for that contract, and
`src/lib/shop-api.ts` is the single boundary that either fetches it or falls
back to `src/mocks/`. Read `src/mocks/README.md` before touching fixture data —
it has the removal checklist.

No component imports a fixture directly. Turning `NEXT_PUBLIC_USE_FIXTURES=false`
is the entire migration.

## Conventions

- **Prices are never computed in a component.** Money crosses the wire as a
  decimal string (`"349.00"`) and is only formatted. VAT, discounts, totals and
  shipping thresholds are all computed outside the view layer. The one
  exception is the discount *percentage* on a sale badge, which is a label, not
  a figure anything depends on.

  While the cart API is missing, that arithmetic lives in
  `src/mocks/cart-engine.ts` — playing the role the endpoint will play, in
  integer halalas, never in a component. Deleting it changes no UI code.
- **Logical properties only** — `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`, never
  `ml-`/`mr-`. Direction-encoding icons get the `flip-rtl` utility.
- **Server Components by default.** Client Components are limited to things
  that genuinely need interactivity: the mobile drawer, the search field, the
  mega-menu hover state, the wishlist toggle.
- **Numerals are pinned to Western digits in both locales** via
  `ar-SA-u-nu-latn`. See `src/lib/format.ts`.
- Bidi: a leading `−` or a run of space-separated digits reorders inside an
  RTL paragraph. Isolate those with `dir="ltr"` on the element.

## Design

Tokens live in `src/app/globals.css`. Palette and type rationale are documented
inline there and rendered at `/design`.

Typography is three faces: IBM Plex Sans Arabic for body in both scripts,
Reem Kufi for Arabic headlines, Cormorant Garamond for Latin headlines.
`--font-display` is rebound per-locale, so each script gets a display face with
presence in that script.

No dark mode — a retailer of white and cream garments has one correct ground.
