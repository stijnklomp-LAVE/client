---
name: database
description: MUST USE whenever interacting with the database (schema, migrations, or Prisma models) in this project. Governs how schema changes are applied to the shared PostgreSQL database.
---

> **⚠️ PRODUCTION REMINDER:** This skill exists because the project is in active development with a shared database.
> **Remove this skill file before deploying to production.** In production, standard Prisma migration workflows
> (create new migration per change) should be restored to maintain an auditable migration history.

# Database Migration Rules

## Core Rule: Never Create New Migration Files

DO NOT create new Prisma migration directories (e.g., `prisma/migrations/2026XXXXXXX_something/`).

**Instead, always follow this priority:**

### 1. Update `prisma/schema.prisma` (Primary)

Edit `prisma/schema.prisma` first. This file is the source of truth for the data model and is what developers read to understand the schema. Keeping it accurate means the model definitions stay clean and the migration SQL only handles DDL mechanics.

### 2. Update `migration.sql` (Secondary)

Only touch the migration SQL if the change requires actual DDL (new tables, columns, constraints, enums, indexes).

## Why?

Multiple services may share a single database. Prisma tracks applied migrations in the `_prisma_migrations` table. Creating multiple migration files across services would cause:

- Migration name clashes in `_prisma_migrations`
- Confusing partial application of changes
- Broken migration history when services are deployed independently

## Table Creation Pattern

When adding a new table, always use this two-step idempotent pattern:

```sql
-- Step 1: Create the table with only its primary key (if it doesn't exist yet)
CREATE TABLE IF NOT EXISTS "NewTable" (
    "id" TEXT NOT NULL,
    CONSTRAINT "NewTable_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add the columns this service cares about (skips if they already exist)
ALTER TABLE "NewTable" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
ALTER TABLE "NewTable" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "NewTable" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

### Why this pattern?

The two-step pattern enforces **service autonomy over a shared schema**. Multiple services may share the same database but each independently owns the columns it needs. No service should assume another service will add or maintain a column it relies on.

The pattern prevents:
- **Tight coupling** — a service would break if another stops adding a column it depended on
- **Migration conflicts** — multiple services trying to create the same table with different column sets
- **Unnecessary dependencies** — a service shouldn't need to know about columns it never reads

This ensures:
- If the table already exists (created by another service in a previous deployment), only the columns this service cares about are added
- If the table doesn't exist yet (e.g., a fresh database), it's created with only the columns this service cares about
- No columns from other services are touched or required

## Breaking Changes Are Expected

The consolidated migration is written to be **fully idempotent**:

- `CREATE TABLE IF NOT EXISTS` — skips if table exists
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — skips if column exists
- `DO $$ ... EXCEPTION WHEN duplicate_object` — skips if enum/constraint exists
- `CREATE UNIQUE INDEX IF NOT EXISTS` — skips if index exists

So making a "breaking change" like adding, removing, or renaming a column is safe:

- **Adding** a column → `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- **Removing** a column → write `ALTER TABLE ... DROP COLUMN IF EXISTS`
- **Renaming** a column → write `ALTER TABLE ... RENAME COLUMN ... TO ...`
- **Adding** a table → two-step pattern above
- **Dropping** a table → write `DROP TABLE IF EXISTS ... CASCADE`

## Workflow

1. Determine what change is needed (add column, rename, etc.)
2. **First**, update `prisma/schema.prisma` to reflect the desired model state
3. **Then**, update the migration SQL file with idempotent DDL statements
4. Keep `schema.prisma` and `migration.sql` consistent with each other
