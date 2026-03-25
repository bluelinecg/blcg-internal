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

## Lesson: `gh` CLI is not available in this environment

**Rule:** Do not attempt to use `gh pr create` or any `gh` command. The GitHub CLI is not installed.

**Why:** Running `gh` always fails with "command not found", wasting a tool call and breaking the PR flow.

**How to apply:** When a PR needs to be created, provide the GitHub URL directly and give the user a ready-to-paste PR title and body. Do not attempt to run `gh` first.
