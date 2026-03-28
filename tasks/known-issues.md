# Known Pre-Existing Issues

Tracked here so agents don't rediscover these each session and don't skip them indefinitely.
Each issue must have a corresponding Kanban backlog card.

---

## [KI-001] Test environment: 69 test files fail with ERR_MODULE_NOT_FOUND

**Discovered:** 2026-03-28
**Kanban card:** "Fix test environment — 69 files ERR_MODULE_NOT_FOUND" (backlog)
**Severity:** High — the entire test suite is effectively blind; no tests run at all

### Root cause (likely)
Vitest cannot resolve `@/` path aliases for several internal modules. The affected imports
exist in source files that are valid at runtime (Next.js resolves them), but the Vitest
config does not replicate the same alias/module resolution.

### Affected missing packages (distinct)

| Missing module | Affected files |
|---------------|----------------|
| `@/lib/api/utils` | notifications routes, webhook routes, automation routes |
| `@/lib/constants/pagination` | `lib/hooks/use-list-state.ts` |
| `@/lib/db/automations` | automation routes + engine |
| `@/lib/db/catalog` | catalog routes |
| `@/lib/db/finances` | invoice routes |
| `@/lib/db/notification-preferences` | `lib/utils/notify-user.ts` |
| `@/lib/db/pipelines` | pipeline item routes |
| `@/lib/db/proposals` | proposal routes |
| `@/lib/db/webhooks` | webhook routes |
| `@tests/helpers/factories` | `lib/utils/dependencies.test.ts` |
| `@tests/helpers/render` | all UI component tests (Badge, Button, Card, Modal, KanbanBoard, etc.) |
| `@react-pdf/renderer` | PDF route tests |

### Suspected fix
1. Audit `vitest.config.ts` (or `vite.config.ts`) alias configuration — ensure `@/` resolves
   to project root the same way `tsconfig.json` paths do.
2. Check whether `@tests/helpers/render` and `@tests/helpers/factories` were planned test
   helpers that were never created — if so, create them.
3. Verify `@react-pdf/renderer` is installed in the test environment (may need
   `optimizeDeps` exclusion or a mock).

### Do not mark resolved until
- `npx vitest run` shows 0 ERR_MODULE_NOT_FOUND errors
- At least the UI component tests and API route tests execute (pass or fail for real reasons)
