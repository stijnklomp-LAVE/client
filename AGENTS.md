<!-- FOR AI AGENTS - Human readability is a side effect, not a goal -->
<!-- Managed by agent: keep sections and order; edit content, not structure -->
<!-- Last updated: 2026-07-31 -->

# AGENTS.md — client (video-editor-client)

Web editor of the location-agnostic video editor. Next.js 16 App Router + Bun + Mantine + Prisma + next-intl.

**Precedence:** the closest `AGENTS.md` to the files you're changing wins. The project skills under `.opencode/skills/` contain the full details — read them before touching their domain:

| Skill | Read before |
|-------|-------------|
| `.opencode/skills/development/SKILL.md` | Running/building/linting anything |
| `.opencode/skills/architecture/SKILL.md` | Reading/writing source code |
| `.opencode/skills/testing/SKILL.md` | Writing/running tests |
| `.opencode/skills/database/SKILL.md` | Any schema/migration change |
| `.opencode/skills/dependency-management/SKILL.md` | Adding/upgrading dependencies |

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

## Commands

Docker Compose is the **primary** execution environment. Run commands inside the `dev` service; host is a last resort. Profiles: `dev` (hot reload, mounts repo), `local` (built image), both include `db`, `rabbitmq`, `db-migration`.

| Task | Command (inside Docker) |
|------|-------------------------|
| Start dev server | `docker compose --profile dev up --build` (then `docker compose --profile dev exec dev <CMD>`) |
| Install deps | `docker compose --profile dev run --rm dev bun install --frozen-lockfile` |
| Lint + typecheck | `docker compose --profile dev run --rm dev bun run lint` |
| Auto-fix lint | `docker compose --profile dev run --rm dev bun run lint:fix` |
| Format | `docker compose --profile dev run --rm dev bun run format` |
| Unit/feature tests | `docker compose --profile dev run --rm dev bun run test` |
| Single test | `docker compose --profile dev run --rm dev bun run test <path> --test-name-pattern "<name>"` |
| Coverage | `docker compose --profile dev run --rm dev bun run test:unit:coverage` |
| E2E (Playwright) | `bun run test:e2e` (app must be running; fixtures checked first) |
| Build | `docker compose --profile local up --build` |
| Prisma generate | `docker compose --profile dev run --rm dev bun run prisma:generate` |
| Migrate (deploy) | `docker compose --profile dev run --rm dev bun run migrate` |
| DB reset | `docker compose --profile dev run --rm dev bun run db:clear` (destructive) |
| TypeDoc | `docker compose --profile dev run --rm dev bun run doc` |

Host fallbacks (same commands without `docker compose ... run --rm dev`). `bun run lint` = ESLint + `tsc --noEmit` — both must pass.

## Architecture

Directory structure and source layout: see `.opencode/skills/architecture/SKILL.md`.

## Conventions (non-negotiable)

- **Imports:** `@/*` → `src/*` aliases only, never relative paths.
- **Functions:** arrow functions everywhere (`const f = () => {}`); no `function` declarations (exceptions: generators, class methods, `this`-binding callbacks).
- **Modules:** ESM only (`type: "module"`, `verbatimModuleSyntax`). `postcss.config.cjs` is the only allowed CJS file.
- **Types:** `T` prefix for type aliases (`TTheme`); interface/type props on all components.
- **Components:** Mantine over raw HTML; `'use client'` only when hooks/browser APIs/event handlers are needed; default to Server Components.
- **Testing:** tests co-located next to source. `*.test.ts` = business logic (no JSX), `*.test.tsx` = UI via Testing Library (`renderHook`, `userEvent`, `MantineProvider` wrapper, `cleanup()`). Don't write tests unless asked.
- **i18n:** never hardcode user-facing strings — use `useTranslations`/next-intl messages.
- **Lint:** strict. **Never** add `eslint-disable` comments, **never** modify eslint config — restructure code to satisfy rules. Prefer `bun run lint:fix` over manual fixes.

## Database (shared PostgreSQL — read `.opencode/skills/database/SKILL.md` first)

- **Never create new Prisma migration files.** The single `migration.sql` is the consolidated, idempotent migration.
- Schema changes: (1) update `prisma/schema.prisma`, (2) update the migration SQL with idempotent DDL (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DO $$ ... EXCEPTION WHEN duplicate_object`).
- Other services share the DB; don't touch tables/columns you don't own. Do **not** delete migration files.

## Git & commit

- Conventional commits; atomic commits; run `bun run lint` + tests before committing.
- Husky pre-commit runs `lint-staged` (Prettier on staged JS/TS/JSON/YAML).

## Response style

- Answer first, lead with the verdict, no fluff. When you run a check, show its output as evidence before claiming success.
- If a command fails, verify against `package.json` / `.opencode/skills/` rather than guessing.
