# Database

## Seed Data

Populate the database with a development user:

```bash
docker compose exec -T db psql -U dev -d video-editor < prisma/seed.sql
```

The seed creates a single User (required by fragment-composer for foreign key references).

The script is idempotent — safe to re-run.

## Migrations

```bash
docker compose --profile dev run --rm dev bun run migrate
```
