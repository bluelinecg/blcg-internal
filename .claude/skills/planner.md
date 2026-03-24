---
name: planner
description: Create structured, high-quality implementation plans before coding.
---

This skill is used for all non-trivial tasks.

A task is non-trivial if it involves:
- Multiple steps
- Architectural decisions
- Database or API changes
- Unclear requirements

---

## Planning Process

1. Understand the task fully
2. Break it into ordered steps
3. Identify dependencies between steps
4. Identify risks and unknowns
5. Define verification for each step

---

## Output Format

Write the plan to `tasks/todo.md` using checkboxes:

- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

Each step must be:
- Atomic
- Testable
- Clear in intent

---

## Required Sections

Include:

### Plan
Step-by-step checklist

### Risks
- What could go wrong
- What assumptions are being made

### Open Questions
- Anything unclear that requires confirmation

---

## Rules

- Do not start coding during planning
- Do not skip edge cases
- Do not create vague steps
- Prefer more granular steps over fewer large ones

---

## Goal

Produce a plan that another engineer could execute without additional context.