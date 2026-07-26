# VPS deployment

Prerequisites: Docker Engine with the Compose plugin, two DNS A/AAAA records
pointing to the VPS, and inbound ports 80/443 open.

```bash
cp .env.vps.example .env.vps
# Edit domains and secrets, then:
docker compose --env-file .env.vps up -d --build
docker compose --env-file .env.vps ps
docker compose --env-file .env.vps logs -f api admin storefront caddy
```

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

## Temporary access by IP, before DNS is mapped

Only for previewing the stack while the domains do not yet resolve. Set
`PUBLIC_HOST` in `.env.vps` to the VPS public IPv4 address, then:

```bash
docker compose --env-file .env.vps -f compose.yml -f compose.ip.yml up -d --build
```

- `http://<PUBLIC_HOST>` — storefront
- `http://<PUBLIC_HOST>:3000` — admin panel, with the API at `/api/v1` on the
  same origin

Open port 3000 at the VPS firewall, restricted to your own IP. There is no TLS
in this mode: the overlay sets `AUTH_COOKIE_SECURE=0` so the browser will keep
the refresh cookie over HTTP, which means the owner login travels in cleartext.

The `--build` is required, not optional. Next.js compiles
`NEXT_PUBLIC_API_BASE_URL` into the browser bundle, so the admin image is pinned
to whichever origin it was built for.

To return to HTTPS: point the DNS records at the VPS, close port 3000, then drop
the overlay and rebuild.

```bash
docker compose --env-file .env.vps up -d --build
```
