# TaskWise Maintainability Refactor — Design Spec

**Date:** 2026-04-11
**Approach:** Component-First Refactor (frontend monolith first, then backend cleanup)
**Goal:** Make the codebase maintainable for AI agents and human developers.

---

## Current State Summary

- **Tech Stack:** Next.js 15.3.1, React 18, TypeScript, SQLite (better-sqlite3), Genkit 1.7.0 (Gemini), Shadcn UI, Tailwind CSS
- **Main pain points:**
  - `src/app/page.tsx` is a 1057-line monolith
  - Duplicate type definitions (camelCase frontend vs snake_case DB)
  - Dual database architecture (direct SQLite + external HTTP service in `db/connection.js`)
  - 477-line `api-client.ts` with repeated fetch/error patterns
  - Unused dependencies (recharts, firebase, next-auth)
  - ~50+ console.log/console.error debug statements scattered throughout
  - Schema defined in 3 places (`src/lib/db.ts`, `db/connection.js`, migrations)

---

## Section 1: Component Decomposition of `page.tsx`

Split the 1057-line monolith into focused components. Existing hooks (`useTaskActions`, `useCategoryActions`, `useUndoRedo`, `useDatePicker`) already hold most business logic — the page just needs to stop being the glue for everything.

### Target structure:

```
src/app/page.tsx                         — orchestrator only, ~100 lines
src/components/task-creator.tsx          — new task input + AI categorization
src/components/task-list.tsx             — already exists, enhance for filtering/sorting
src/components/task-item.tsx             — already exists, enhance with inline editing
src/components/task-edit-modal.tsx       — extracted from page.tsx's edit form logic
src/components/category-sidebar.tsx      — category list, filter, create button
src/components/app-header.tsx            — title, settings menu, theme toggle, undo/redo
src/components/date-picker-wrapper.tsx   — date picker integration extracted
```

### Rules:
- Each component owns its own local state
- Communication via callbacks or shared hooks
- No component exceeds ~200 lines
- Preserve all existing functionality — no feature changes

---

## Section 2: Type System Consolidation

### Problem:
Two Task types exist:
- `src/app/types/task.ts` — frontend format (camelCase)
- `src/app/types/index.ts` — database format (snake_case)

### Solution:
- Single canonical `Task` type in `src/app/types/task.ts` using **camelCase** throughout the app
- `Category`, `Subtask`, `UserSettings` also consolidated into `src/app/types/`
- The API layer (`api-client.ts`) handles snake_case <-> camelCase conversion in **one place**
- Rest of the codebase never thinks about DB column names

---

## Section 3: Database Consolidation

### Problem:
Dual DB architecture — direct SQLite in Next.js API routes AND a separate HTTP service (`db/connection.js`, 971 lines).

### Solution:
- **Delete `db/connection.js` entirely**
- Remove `dev:with-db` and `db:start` scripts from `package.json`
- Remove API rewrites in `next.config.ts` that proxy to the DB service
- `src/lib/db.ts` becomes the **single source of truth** for schema and migrations
- Clean up `isDevelopment` branching logic scattered through the codebase
- Remove `docker-compose.dev.yml` if it only exists for the DB service

---

## Section 4: API Client Cleanup

### Problem:
`src/lib/api-client.ts` (477 lines) repeats the same fetch/error/auth pattern across `TaskApi`, `CategoryApi`, `UserSettingsApi`.

### Solution:
- Create shared `apiFetch()` helper handling:
  - Auth headers/cookies
  - Error handling and status codes
  - JSON parsing
  - Snake-to-camel and camel-to-snake conversion
- `TaskApi`, `CategoryApi`, `UserSettingsApi` become thin wrappers calling `apiFetch()`
- Target: reduce to ~200-250 lines total

---

## Section 5: Dependency & Logging Cleanup

### Remove unused dependencies:
- `recharts` — imported but never used
- `firebase` — in deps but minimal/no usage
- `next-auth` — installed but custom session system used instead
- Check `@genkit-ai/next` — remove if unused

### Remove `src/lib/storage.ts`:
- Currently acts as a redirect layer — remove if redundant

### Logging cleanup:
- Strip all `console.log` debug statements
- Keep only genuine `console.error` calls for actual error conditions
- No new logging framework needed — just remove the noise

---

## Execution Order

1. **Type consolidation** (Section 2) — foundation for everything else
2. **Component decomposition** (Section 1) — biggest maintainability win
3. **Database consolidation** (Section 3) — remove duplication
4. **API client cleanup** (Section 4) — reduce repetition
5. **Dependency & logging cleanup** (Section 5) — final polish

---

## Constraints

- **No feature changes** — this is purely structural
- **No new dependencies** unless replacing something removed
- **No test framework yet** — that's a separate effort
- **Preserve all existing UI behavior** — users shouldn't notice any difference
- **Security fix** in `db/connection.js` is moot since we're deleting it
- **Keep it simple** — ask user before doing anything complex or ambiguous
