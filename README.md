# Location-Agnostic Video Editor

<p align="center">A web-based video editor that works with media from any location — local storage, home NAS, or cloud — minimizing remote storage costs while enabling editing from any device.</p>

## Features

- **Flexible storage** — Import media from local storage, home NAS, cloud services, and network APIs.
- **Fidelity management** — Uses lossy compressed proxies in the cloud; high-fidelity frames available when working locally.
- **Multi-device editing** — Sync projects across devices using edit metadata and video segment concepts.
- **Frame-level editing** — Full precision when local or high-quality media is available.
- **Cost-effective** — Minimize cloud storage by keeping high-res assets where it makes sense.

## Architecture

```
Assets → Segments (Timelines) → Timeline → Render
```

- **Assets** — Media files located anywhere (local, NAS, cloud).
- **Segments** — Video clips defined by in/out time ranges; can be split, merged, and rearranged.
- **Timeline** — Full project timeline composed of segments.
- **Render** — Final video output using local or cloud-based rendering.

## Built with

- [Next.js](https://nextjs.org/) — React framework with server-side rendering
- [TypeScript](https://www.typescriptlang.org/) — Static typing
- [Mantine](https://mantine.dev/) — Component library with PostCSS theming
- [Motion](https://motion.dev/) — Declarative animations
- [Tabler Icons](https://tabler.io/icons) — Open-source icon set
- [next-intl](https://next-intl.dev/) — Internationalization
- [Bun](https://bun.sh/) — Runtime, bundler, and test runner

## Getting started

```sh
bun install --frozen-lockfile
```

```sh
# Development
bun run dev

# Production
bun run build && bun run start
```

### With Docker

```sh
docker build -t client . && docker run --rm -p 3000:3000 client
```

### With Docker Compose

```sh
# There are multiple profiles that can be run:
# dev -> Mounts the current directory to the container and runs the service in watch mode
# local -> Builds and runs the application image from the current code
docker compose --profile <PROFILE> up --build
```

#### Database

A PostgreSQL database is available via Docker Compose. Database migrations run automatically via the `db-migration` service when using any Docker Compose profile.

#### RabbitMQ

A RabbitMQ service is available via Docker Compose for message queue capabilities. The management UI is accessible at `http://localhost:15672`.

## Test

### Lint

ESLint is used as a linter and uses Prettier to format code.

```sh
# ESLint
bun run lint

# ESLint and fix (also sorts JSON files)
# Prefix with `EXCLUDE_PATHS="<file_1> <file_2>"` to exclude files/directories (using GLOB pattern) from being auto-sorted
bun run lint:fix

# Sort a specific JSON file and/or directory
# Important: Don't run this command without a specified file/directory (using GLOB pattern)
bunx jsonsort "<file_1> <file_2>"
```

### Unit & Feature tests

```sh
# Unit tests
bun run test

# Unit tests with coverage
bun run test:coverage

# Feature tests only
bun run test:feature
```

### E2E tests

```sh
# Requires the application to be running
bun run test:e2e

# With Playwright UI mode
bun run test:e2e:ui
```

### Acceptance tests

```sh
bun run test:acceptance
```

#### With Docker Compose

```sh
# Run once and exit
docker compose --profile test up --build --attach acceptance-once --exit-code-from acceptance-once

# Run multiple times
# There are multiple profiles that can be run for the acceptance tests:
# dev
# local
docker compose --profile <PROFILE> up --build -d && docker compose --profile <PROFILE> exec -ti dev sh -c "bun run test:acceptance"
```

### TypeScript type checking

```sh
bun run typecheck
```

## License

FSL-1.1-MIT
