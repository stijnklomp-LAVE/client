# Lib directory

Shared utilities, business logic, and configuration that are used across the application.

## Structure

- **`api/`** — Backend API layer: JWT signing (`jwt.ts`) and fragment-composer proxy (`fragment-composer.ts`)
- **`db/`** — Database client: Prisma singleton (`prisma.ts`)
- **`devices/`** — Device-related business logic: heartbeat, local device ID, P2P transfer, WebRTC signaling, send fragments
- **`theme/`** — Theme system: context, provider, hook, and types for the dark/light mode switcher
- **`utils/`** — General-purpose utility functions
