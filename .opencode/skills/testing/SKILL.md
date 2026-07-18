---
name: testing
description: MUST USE when writing, running, or debugging tests in this Next.js + Bun project. Tests use Bun's test runner (`bun:test`) with Testing Library for component tests.
---

# Project Testing

This skill describes the testing conventions for this Next.js + Bun project.

## Test Runner

- **Bun's built-in test runner** (`bun:test`) — no additional dependencies needed
- **Testing Library** (`@testing-library/react`) — for UI/component tests
- **user-event** (`@testing-library/user-event`) — for realistic user interactions in UI tests

## Test Organization

Tests are **co-located** with the source file they test. Two categories exist, distinguished by file extension:

| Extension    | Category       | What it tests                                                           |
| ------------ | -------------- | ----------------------------------------------------------------------- |
| `*.test.ts`  | Business logic | Pure functions, hooks (via `renderHook`), utilities, API route handlers |
| `*.test.tsx` | UI / elements  | Component rendering, user interactions, visual states                   |

This maps naturally: business logic never imports JSX (`.ts`), while UI tests always render components (`.tsx`).

### Business Logic Tests (`*.test.ts`)

Test non-UI code — functions, hooks, utilities, API routes.

**Patterns:**

- Use `renderHook` from `@testing-library/react` for custom hooks
- Mock external dependencies (mediabunny, filesystem, etc.) with `vi.mock`
- No `MantineProvider` or component wrappers needed
- Mock `next-intl` if the code under test uses translations

**Examples:**

```
src/lib/editor/use-recording.test.ts          — recording pipeline logic
src/app/api/forgot-password/route.test.ts     — API route handler
```

### UI / Element Tests (`*.test.tsx`)

Test component rendering, user interaction, and visual states.

**Patterns:**

- Wrap in `MantineProvider` + relevant context providers (e.g., `EditorContext.Provider`)
- Mock `next-intl` with `useTranslations: () => (key: string) => key`
- Assert on rendered output (`getByText`, `getByLabelText`) and `data-` attributes
- Test label/button visibility via CSS attribute checks (`toHaveAttribute("data-hidden")`), not DOM presence — elements may exist in the DOM while hidden via CSS
- Use `userEvent.setup()` for click/input interactions
- Mock browser APIs (`navigator.mediaDevices`) in `beforeEach`
- Call `cleanup()` in `afterEach`

**Examples:**

```
src/components/project-editor/recording-controls.test.tsx   — recording UI controls
src/components/project-editor/video-viewer.test.tsx          — video viewer + split button
src/components/project-editor/side-pane.test.tsx             — side pane
```

### Both Categories

- Tests are placed **next to the file they test** (same directory)
- Import `describe`, `test`, `expect`, `vi`, `mock`, `beforeEach`, `afterEach` from `bun:test`
- Run `bun run lint:fix` after writing tests to auto-fix issues

## Running Tests

```bash
# Run all tests
docker compose --profile dev run --rm dev bun run test

# Run tests matching a pattern
docker compose --profile dev run --rm dev bun run test --test-name-pattern "RecordingControls"

# Run a specific test file
docker compose --profile dev run --rm dev bun run test src/components/project-editor/recording-controls.test.tsx

# Run tests with coverage
docker compose --profile dev run --rm dev bun run test:coverage
```

**Fallback (host, no Docker):**

```bash
bun run test
bun run test --test-name-pattern "useRecording"
```

## E2E Tests

A Playwright service is commented out in `docker-compose.yml`. Not currently active — no Playwright tests exist yet.

## Important Rules

1. **Do not write test files** unless the user explicitly asks
2. **Run `bun run lint:fix` after writing tests** — prefer auto-fix over manual fixes
3. **Never add `eslint-disable` comments** — fix code to satisfy lint rules instead
