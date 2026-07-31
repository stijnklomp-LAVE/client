---
name: architecture
description: MUST USE when working with this Next.js + Bun + Mantine + Prisma + next-intl project. Understands the Next.js App Router conventions, file organization, Mantine component patterns, and code conventions. Use when reading, writing, or modifying any source code in this project.
---

# Project Architecture

This skill describes the architecture, patterns, and conventions used in this Next.js + Bun + Mantine project.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Next.js 16 with App Router (all routes under `src/app/[locale]/`), `output: "standalone"`
- **Language**: TypeScript (strict, ES2017, Bundler module resolution, `verbatimModuleSyntax`)
- **UI Library**: Mantine 9 with PostCSS-based styling, Tabler icons
- **i18n**: next-intl (`src/i18n/`) — user-facing strings come from message catalogs, never hardcoded
- **Auth**: next-auth v5 (credentials + Prisma adapter, bcrypt, JWT) — `src/auth.ts`
- **Database**: PostgreSQL via Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`), generated client in `generated/`
- **Media**: mediabunny (decoder/compositor) in `src/lib/editor/`; WebRTC P2P device transfer in `src/lib/devices/`
- **Email**: React Email templates in `src/emails/`, sent via `src/lib/email/`

## Directory Structure

The project follows Next.js App Router conventions:

| Directory / Pattern | Purpose                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| `src/app/[locale]/` | Locale-scoped routes; `(with-nav)` / `(without-nav)` route groups for layout variants |
| `src/app/[locale]/(with-nav)/` | Pages with navigation: home, login, register, profile, projects, devices, forgot/reset-password |
| `src/app/[locale]/(without-nav)/` | Full-screen pages: `editor/` |
| `src/app/api/`       | Route handlers (auth, devices, projects, profile, transfer-requests, signaling, verify-email, ...) |
| `src/components/`    | React components by domain: `auth/`, `devices/`, `project-editor/`, `projects/`, `providers/`, `ui/` |
| `src/lib/`           | Non-component logic: `api/` (fragment-composer client, JWT), `db/` (Prisma client), `devices/` (WebRTC P2P), `editor/` (mediabunny compositor, recording), `email/`, `theme/`, `utils/` |
| `src/emails/`        | React Email templates (verification, password reset)                                |
| `src/i18n/`          | next-intl routing/request/messages configuration                                    |
| `src/auth.ts`        | next-auth configuration                                                             |
| `src/proxy.ts`       | Proxy configuration                                                                 |
| `src/pact/`          | Pact consumer contract tests                                                        |
| `test/e2e/`          | Playwright E2E tests                                                                |
| `prisma/`            | `schema.prisma` + single consolidated `migration.sql` (see database skill)          |
| `public/`            | Static assets (images, fonts, SVGs)                                                 |
| `*.test.ts` / `*.test.tsx` | Tests co-located with source (`*.test.ts` = no JSX, `*.test.tsx` = rendered components) |

### Key Files

- `src/app/layout.tsx` — Root layout (Mantine provider, locale routing)
- `src/app/[locale]/(with-nav)/page.tsx` — Home page
- `src/app/[locale]/(with-nav)/login/`, `register/`, `profile/`, `projects/`, `devices/`, `forgot-password/`, `reset-password/` — Auth and app pages
- `src/app/[locale]/(without-nav)/editor/` — Full-screen project editor (recording, compositor)
- `src/lib/theme/` — Mantine theme system (`context.ts`, `provider.tsx`, `types.ts`, `index.ts`)
- `src/lib/db/prisma.ts` — Prisma client singleton
- `src/lib/editor/` — mediabunny compositor/decoder pool, recording hooks, fragment media
- `src/lib/devices/` — WebRTC P2P transfer, signaling, heartbeat

## Path Aliases

Use `@/*` for imports. Do NOT use relative paths (e.g., `../../lib/theme`):

- `@/*` → `src/*`

Configured in `tsconfig.json` paths and `bunfig.toml` resolve alias.

## Next.js App Router Conventions

### Server Components vs Client Components

- **Server Components** (default): Run on the server. Can access the file system, database, etc. No `'use client'` directive.
- **Client Components**: Must add `'use client'` at the top of the file. Required for:
    - React hooks (`useState`, `useEffect`, `useContext`)
    - Browser APIs (`localStorage`, `window`)
    - Event handlers (`onClick`, `onSubmit`)
    - Mantine components that require client-side rendering

### Theming with Mantine

The theme system is built on Mantine's theming with a light/dark mode persisted via `localStorage` + cookie:

- `src/lib/theme/context.ts` — React context for theme state
- `src/lib/theme/provider.tsx` — Theme provider component (wraps children with `MantineProvider`)
- `src/lib/theme/types.ts` — Theme types (`TTheme`, `TThemeModel`, etc.)
- `src/lib/theme/index.ts` — Re-exports for clean imports

The default mode is `dark` (`ThemeModel.currentColourMode`); the `theme-toggle` component switches modes, persisting the choice.

### Layout Pattern

Root layout (`src/app/layout.tsx`):

- Imports `@mantine/core/styles.css` for base Mantine styles
- Imports `globals.scss` for custom styles
- Wraps children with `ThemeProvider`
- Sets up next-intl locale routing (pages live under `src/app/[locale]/`)

## Error Handling

Next.js App Router provides error boundaries via `error.tsx` and `global-error.tsx`:

- `error.tsx` — Catches errors in the route segment
- `global-error.tsx` — Catches errors globally (must be a Client Component)

## PostCSS Configuration

PostCSS is configured in `postcss.config.cjs`:

- `postcss-preset-mantine` — Mantine's PostCSS preset
- `postcss-simple-vars` — CSS variables for Mantine breakpoints

## Adding a New Page

Follow this order when adding a new page:

1. **Create the page** — Add `src/app/[locale]/<route>/page.tsx` (inside `(with-nav)` or `(without-nav)` depending on the layout variant)
2. **Add layout** (if needed) — Add `src/app/[locale]/<route>/layout.tsx`
3. **Add loading state** (if needed) — Add `src/app/[locale]/<route>/loading.tsx`
4. **Add error boundary** (if needed) — Add `src/app/[locale]/<route>/error.tsx`
5. **Add components** — Create components in `src/components/` if reusable
6. **Add styles** — Use Mantine components or add CSS modules
7. **Add i18n messages** — User-facing strings go into the next-intl message catalogs (`src/i18n/`)

## Adding a New Component

1. Create the component in `src/components/<category>/<component-name>/index.tsx`
2. Use Mantine components where appropriate
3. Add `'use client'` if the component needs client-side features
4. Use TypeScript types and export props interface

## Important Conventions

1. **Always use `@/*` imports** — Never use relative paths
2. **Use Mantine components** — Prefer Mantine over raw HTML for consistency
3. **Keep server components default** — Only add `'use client'` when necessary
4. **Type all props** — Use TypeScript interfaces for component props
5. **Use `T` prefix for type aliases** — e.g., `TTheme`, `TThemeModel`
6. **Export from `index.ts`** — Re-export from `src/lib/<module>/index.ts` for clean imports
7. **Co-locate tests with source** — Business logic tests use `*.test.ts`; UI/element tests use `*.test.tsx`. The extension distinguishes the category: `.ts` = no rendering, `.tsx` = component rendering with Testing Library

## Code Style

### Arrow Functions

Use arrow functions over `function` declarations everywhere:

```ts
// Correct
const add = (a: number, b: number): number => a + b
export const useToggle = () => { ... }
const handleClick = () => { ... }

// Incorrect
function add(a: number, b: number): number { return a + b }
export function useToggle() { ... }
```

This applies to all function forms:

- `function name() {}` → `const name = () => {}`
- `async function name() {}` → `const name = async () => {}`
- `export function name() {}` → `export const name = () => {}`
- `export default function name() {}` → `const name = () => {}` + `export default name`

**Exceptions:** Generator functions (`function*`), class methods, and callbacks passed to utilities that bind `this` explicitly.

### ES Modules

The project uses ES Modules exclusively (enforced by `"type": "module"` in `package.json` and `verbatimModuleSyntax` in `tsconfig.json`):

```ts
// Correct
import { foo } from "./bar"
export const baz = () => {}

// Incorrect
const foo = require("./bar")
module.exports = { baz }
```

**Known exception:** `postcss.config.cjs` is kept as CommonJS because PostCSS requires it. No other `.cjs` or CJS-style files should be added.
