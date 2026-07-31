<!-- FOR AI AGENTS - Human readability is a side effect, not a goal -->
<!-- Managed by agent: keep sections and order; edit content, not structure -->
<!-- Last updated: 2026-07-31 | Last verified: 2026-08-01 -->

# AGENTS.md — client (video-editor-client)

Web editor of the location-agnostic video editor. Next.js 16 App Router + Bun + Mantine + Prisma + next-intl.

**Precedence:** the **closest `AGENTS.md`** to the files you're changing wins. Explicit user prompts override files.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime / package manager / test runner | Bun (`bun`) — `bun:test`, `bun --bun next` |
| Framework | Next.js **16.2.7**, App Router, `output: "standalone"` |
| UI | Mantine 9 + PostCSS (`postcss-preset-mantine`), Tabler icons |
| i18n | next-intl — all routes live under `src/app/[locale]/` |
| Auth | next-auth v5 beta + Prisma adapter (credentials, bcrypt, JWT, emails via `src/emails/`) |
| Database | PostgreSQL via Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`), generated client in `generated/` |
| Media | mediabunny (decoder/compositor), WebRTC P2P device transfer (`src/lib/devices/`) |

## Commands (verified)

> Run inside Docker Compose (profiles `dev` / `local` / `test` / `shared`); host is a last resort. Full list: `.opencode/skills/development/SKILL.md`.

| Task | Command |
|------|---------|
| Dev server | `docker compose --profile dev up --build` |
| Lint + typecheck (ESLint + tsc) | `docker compose --profile dev run --rm dev bun run lint` |
| Unit/feature tests | `docker compose --profile dev run --rm dev bun run test` |
| Single test | `docker compose --profile dev run --rm dev bun run test <path> --test-name-pattern "<name>"` |
| Coverage | `docker compose --profile dev run --rm dev bun run test:unit:coverage` |
| E2E (Playwright) | `bun run test:e2e` (app must be running; fixtures checked first) |
| Build | `docker compose --profile local up --build` |
| Prisma | `docker compose --profile dev run --rm dev bun run prisma:generate` / `bun run migrate` |

> If commands fail, verify against `package.json` / `.opencode/skills/development/SKILL.md` rather than guessing.

## Workflow & Response Style

- **Before coding**: Read nearest `AGENTS.md` + relevant `.opencode/skills/` for the area you're touching
- **After each change**: Run the smallest relevant check (lint → single test)
- **Before committing**: Run `bun run lint` + full unit tests
- **Evidence**: Show command output before claiming done — never say "try again", "should work now", "tested", "verified", or "all green" without pasted output in the same turn
- **Style**: Answer first, lead with the verdict, no fluff

## Conventions (non-negotiable)

- **Imports:** `@/*` → `src/*` aliases only, never relative paths.
- **Functions:** arrow functions everywhere; no `function` declarations (exceptions: generators, class methods, `this`-binding callbacks).
- **Modules:** ESM only (`type: "module"`, `verbatimModuleSyntax`). `postcss.config.cjs` is the only allowed CJS file.
- **Types:** `T` prefix for type aliases (`TTheme`); interface/type props on all components.
- **Components:** Mantine over raw HTML; `'use client'` only when hooks/browser APIs/event handlers are needed; default to Server Components.
- **Testing:** tests co-located next to source. `*.test.ts` = business logic (no JSX), `*.test.tsx` = UI via Testing Library. Don't write tests unless asked.
- **i18n:** never hardcode user-facing strings — use `useTranslations`/next-intl messages.
- **Lint:** strict. **Never** add `eslint-disable` comments, **never** modify eslint config — restructure code to satisfy rules. Prefer `bun run lint:fix`.

## Database (shared PostgreSQL — read `.opencode/skills/database/SKILL.md` first)

- **Never create new Prisma migration files.** The single `migration.sql` is the consolidated, idempotent migration.
- Schema changes: (1) update `prisma/schema.prisma`, (2) update the migration SQL with idempotent DDL (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DO $$ ... EXCEPTION WHEN duplicate_object`).
- Other services share the DB; don't touch tables/columns you don't own. Do **not** delete migration files.

## Boundaries

### Ask First
- Adding new dependencies; modifying CI/CD configuration; changing public API signatures; running full e2e suites

### Never Do
- Commit secrets; modify `node_modules/` or generated files
- Add `eslint-disable` comments or modify eslint config
- Delete migration files or schema changes (see database skill)
- Edit installed skill/plugin cache paths — always the source worktree

## Scoped AGENTS.md
<!-- AGENTS-GENERATED:START scope-index -->
No scoped AGENTS.md files — domain details live in `.opencode/skills/`.
<!-- AGENTS-GENERATED:END scope-index -->
