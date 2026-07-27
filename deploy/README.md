# VPS deployment

Prerequisites: Docker Engine with the Compose plugin, two DNS A/AAAA records
pointing to the VPS, and inbound ports 80/443 open.

```bash
cp .env.vps.example .env.vps
# Edit domains and secrets, then:
docker compose --env-file .env.vps --profile proxy up -d --build
docker compose --env-file .env.vps --profile proxy ps
docker compose --env-file .env.vps --profile proxy logs -f api admin storefront caddy
```

`--profile proxy` is what starts Caddy, and it is required for this mode —
without it the stack comes up with no reverse proxy and nothing bound to
80/443. The profile exists so the IP deployment below can leave TLS out
entirely instead of working around a proxy that redirects HTTP to HTTPS.

Caddy obtains and renews HTTPS certificates automatically. PostgreSQL and the
uploads directory use named volumes. The API applies Alembic migrations before
starting; containers depending on it wait for its health check.

After the first start, seed the owner account using the `OWNER_EMAIL` and
`OWNER_PASSWORD` values from `.env.vps`:

```bash
docker compose --env-file .env.vps exec api python -m app.seed
```

Store the owner password securely and rotate it after the first login.

Back up both `postgres_data` and `uploads` before every upgrade. Keep the
database private; the Compose stack does not publish port 5432.

## Access by IP, before DNS is mapped

For running the stack while the domains do not yet resolve. Set `PUBLIC_HOST`
in `.env.vps` to the VPS public IPv4 address, then:

```bash
docker compose --env-file .env.vps -f compose.yml -f compose.ip.yml up -d --build
```

- `http://<PUBLIC_HOST>` — storefront
- `http://<PUBLIC_HOST>:3000` — admin panel
- `http://<PUBLIC_HOST>:8000` — API (`/api/v1`, `/shop/v1`, `/uploads`)

`STORE_DOMAIN` and `ADMIN_DOMAIN` can stay empty in this mode; the overlay
replaces every value derived from them.

There is no reverse proxy here. Each container publishes its own port and the
browser reaches it directly, so nothing is listening on 443 and plain HTTP is
never redirected to HTTPS. It also means the admin panel and the storefront
call the API cross-origin rather than through a shared origin — handled by the
CORS origins the overlay sets on the API.

Open ports 3000 and 8000 at the VPS firewall, restricted to your own IP. There
is no TLS in this mode: the overlay sets `AUTH_COOKIE_SECURE=0` so the browser
will keep the refresh cookie over HTTP, which means the owner login travels in
cleartext.

The `--build` is required, not optional. Next.js compiles
`NEXT_PUBLIC_API_BASE_URL` into the browser bundle, so the admin image is pinned
to whichever origin it was built for.

If the browser still forces `https://` on the IP after switching to this mode,
confirm where the redirect comes from before changing anything — the server no
longer sends one:

```bash
curl -sSI http://<PUBLIC_HOST>/          # expect 200, not 301/308
```

If `curl` returns 200 but Chrome does not, the redirect is cached in the
browser, not served. Chrome stores permanent redirects on disk. Verify in a
private window, then clear it under *Settings → Privacy → Delete browsing data
→ Cached images and files*.

To return to HTTPS: point the DNS records at the VPS, set `STORE_DOMAIN` and
`ADMIN_DOMAIN`, close ports 3000 and 8000, then drop the overlay, add the
profile, and rebuild.

```bash
docker compose --env-file .env.vps --profile proxy up -d --build
```
