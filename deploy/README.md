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
