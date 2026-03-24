# Lessons Learned

This file captures recurring mistakes and the rules created to prevent them.

Agents must:
- Read this file at the start of each task
- Apply relevant lessons during execution

---

## Lesson: `gh` CLI is not available in this environment

**Rule:** Do not attempt to use `gh pr create` or any `gh` command. The GitHub CLI is not installed.

**Why:** Running `gh` always fails with "command not found", wasting a tool call and breaking the PR flow.

**How to apply:** When a PR needs to be created, provide the GitHub URL directly and give the user a ready-to-paste PR title and body. Do not attempt to run `gh` first.
