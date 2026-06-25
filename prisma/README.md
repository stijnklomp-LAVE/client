# Database

## Seed Data

Populate the database with development seed data:

```bash
docker compose exec -T db psql -U dev -d video-editor < prisma/seed.sql
```

The seed creates a User, two Devices (Desktop + Phone), a VideoProject with 4 fragments, and DeviceFragment mappings so you can test sharing from one device to another.

**Mock files:** The seed references `.png` files at `fragment-composer/mock/`. Place them there (the server doesn't read them yet — P2P currently sends empty mock buffers — but they serve as a reference for future real file transfer).

The script is idempotent — safe to re-run.

## Migrations

```bash
docker compose --profile dev run --rm dev bun run migrate
```
