# Lessons Learned

This file captures recurring mistakes and the rules created to prevent them.

Agents must:
- Read this file at the start of each task
- Apply relevant lessons during execution

---

## Lesson: Fix trivial pre-existing issues when encountered — don't leave them because "I didn't cause them"

**Rule:** If a trivial issue is discovered during a task — a broken test, a missing docblock, a misnamed variable — fix it immediately as part of the work, even if it predates the current session.

**Why:** Ignoring pre-existing issues because "I didn't introduce them" causes them to accumulate indefinitely. If it's small enough to fix in a single line or a few lines, the cost of fixing it is lower than the cost of tracking it separately or explaining why it was left behind.

**How to apply:**
- If a pre-existing issue is trivial (< ~10 lines, no architectural decision required), fix it inline and note it in the summary.
- If it is non-trivial (requires its own planning, risk assessment, or significant code change), flag it clearly and create a separate task rather than silently ignoring it.
- The threshold question: "Would a senior engineer fix this right now, or open a ticket?" — match that standard.

---

## Lesson: Kanban board is the task source of truth — always use the internal API

**Rule:** At the start of every task, read the Kanban board via the internal API to find the next item. When beginning work, move it to `in_progress`. When complete, move it to `done`. Never source work from tasks/todo.md or memory alone.

**Why:** Ryan requires the Kanban board to be the single authoritative task list. Agents have previously stopped using it mid-session — this must not happen.

**How to apply:**
```bash
# Read the INTERNAL_API_KEY from .env.local
INTERNAL_API_KEY=$(grep INTERNAL_API_KEY .env.local | cut -d'=' -f2)

# Get next backlog item (sorted by sort_order)
curl -s -H "x-internal-key: $INTERNAL_API_KEY" "http://localhost:3000/api/internal/tasks?status=backlog"

# Move to in_progress when starting
curl -s -X PATCH -H "x-internal-key: $INTERNAL_API_KEY" -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' \
  http://localhost:3000/api/internal/tasks/<id>

# Move to done when complete
curl -s -X PATCH -H "x-internal-key: $INTERNAL_API_KEY" -H "Content-Type: application/json" \
  -d '{"status":"done"}' \
  http://localhost:3000/api/internal/tasks/<id>
```
- Work items are picked by `sortOrder` ascending — lowest number is next
- Check `in_progress` first at the start of a session; if something is already there, resume it before starting new work

---

## Lesson: `gh` CLI is not available in this environment

**Rule:** Do not attempt to use `gh pr create` or any `gh` command. The GitHub CLI is not installed.

**Why:** Running `gh` always fails with "command not found", wasting a tool call and breaking the PR flow.

**How to apply:** When a PR needs to be created, provide the GitHub URL directly and give the user a ready-to-paste PR title and body. Do not attempt to run `gh` first.
