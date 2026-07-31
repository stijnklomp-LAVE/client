---
name: testing
description: MUST USE when writing, running, or debugging tests in this Next.js + Bun project. Holds project-specific test recipes (mocking, data-attribute assertions, E2E layout); test discipline and run commands live in the global test-driven-development skill and AGENTS.md.
---

# Project Testing Conventions

Project-specific test conventions for this Next.js + Bun project. Test categories (`*.test.ts` vs `*.test.tsx`), co-location rules, and run commands are in `AGENTS.md`; red-green-refactor discipline is the global `test-driven-development` skill.

## Project Rule Overrides Global TDD

`AGENTS.md` forbids writing test files unless asked. When tests ARE expected or requested, follow the global `test-driven-development` skill (failing test first, minimal code, refactor).

## Business Logic Tests (`*.test.ts`)

- Mock external dependencies (mediabunny, filesystem, etc.) with `vi.mock`
- Mock `next-intl` when the code under test uses translations:

```ts
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))
```

## UI Tests (`*.test.tsx`)

- Mock `next-intl` with `useTranslations: () => (key: string) => key`
- Assert CSS-driven visibility via `toHaveAttribute("data-hidden")`, not DOM presence — elements may exist in the DOM while hidden via CSS
- Mock browser APIs (e.g. `navigator.mediaDevices`) in `beforeEach`

## Example Tests

| Test | Covers |
|------|--------|
| `src/components/project-editor/recording-controls.test.tsx` | Recording UI controls |
| `src/components/project-editor/video-viewer.test.tsx` | Video viewer + split button |
| `src/components/project-editor/side-pane.test.tsx` | Side pane |
| `src/lib/editor/use-recording.test.ts` | Recording pipeline logic |
| `src/app/api/forgot-password/route.test.ts` | API route handler |

## E2E Tests

- Location: `test/e2e/` (`playwright.config.ts` sets `testDir: "./test/e2e"`)
- The app must be running first; `scripts/check-e2e-fixtures.ts` verifies fixtures automatically (run command in `AGENTS.md`)
