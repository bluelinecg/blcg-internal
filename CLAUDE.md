# BLCG Agent Execution Guide

This file defines how Claude Code agents must operate in this repository.

It is the primary execution contract.

Supporting files:
- ARCHITECTURE.md → system design and structure
- STANDARDS.md → coding, testing, and security rules

If conflicts arise:
CLAUDE.md takes precedence.

---

## Required File Read Order

At the start of every task:

1. Read CLAUDE.md
2. Read TASKS.md
3. Read tasks/lessons.md (if it exists)
4. Reference ARCHITECTURE.md when deciding structure
5. Reference STANDARDS.md when writing or validating code

Do not begin implementation until this context is understood.

---

## Hard Rules

These rules must never be violated:

- Do not use the `any` type
- Do not query the database outside /lib/db
- Do not skip writing tests
- Do not modify authentication or security configurations
- Do not install dependencies without approval
- Do not refactor outside the scope of the task
- Do not leave console.log or commented-out code
- Do not mark a task complete without verification
- Do not guess when unsure

---

## Execution Flow

For every task:

1. Understand the task
2. Classify the task (feature, bug, API, DB, frontend, refactor)
3. Apply the correct execution flow (see below)
4. Use required skills automatically
5. Implement following ARCHITECTURE.md and STANDARDS.md
6. Write or update tests
7. Verify correctness
8. Review before completion
9. Document results in tasks/todo.md
10. Capture lessons if applicable

---

## Standard Execution Flows

### Feature Development
planner → implementation → test-writer → reviewer

### Bug Fixing
debugger → implementation → test-writer → reviewer

### Database Changes
db-designer → planner → implementation → test-writer → reviewer

### API Development
api-designer → planner → implementation → test-writer → reviewer

### Frontend Work
frontend-design → implementation → reviewer

### Refactoring
refactorer → test-writer → reviewer

Do not skip steps.

---

## Plan Mode

Required for non-trivial tasks.

A task is non-trivial if it includes:
- Multiple steps
- Architecture decisions
- Database or API changes
- Unclear requirements

Requirements:
- Write plan to tasks/todo.md
- Use atomic, testable steps
- Identify risks and unknowns
- Wait for approval before implementation

If issues arise:
Stop and re-plan before continuing.

---

## Task Management

All work must be tracked in tasks/todo.md.

Rules:
- Use checkbox format
- Keep tasks small and clear
- Update progress continuously

At completion, include:
- Summary of changes
- Reasoning for decisions
- Verification steps performed

---

## Verification Requirements

Before marking complete:

- Code executes correctly
- Tests exist and pass
- Edge cases are handled
- No regressions introduced
- Behavior is verified, not assumed

Standard:
Would a senior engineer approve this?

---

## Lessons System

At the start of each task:
- Review tasks/lessons.md
- Apply relevant rules

After any correction:
- Add a new lesson
- Convert mistake into a reusable rule

Rules:
- Keep lessons concise
- Focus on patterns, not one-offs
- Do not repeat the same mistake twice

---

## Code Execution Rules

### Before Writing Code

- Read full relevant files
- Check for reusable components or utilities
- Confirm correct placement via ARCHITECTURE.md
- Avoid introducing new patterns unnecessarily

---

### When Writing Code

- Follow established patterns exactly
- Keep changes minimal and scoped
- Write tests alongside implementation

---

### When Modifying Code

- Preserve style and structure
- Do not refactor unrelated areas
- Flag issues outside scope

---

### Database Rules

- All queries must go through /lib/db
- Never modify schema without approval
- Respect RLS and data integrity constraints

---

## Bug Fixing

When debugging:

- Identify root cause (do not guess)
- Use logs, errors, and tests
- Fix the underlying issue
- Verify completely before completion

---

## Subagent Usage

Use subagents for:
- Research
- Alternative approaches
- Parallel analysis

Rules:
- One task per subagent
- Keep scope focused
- Use for complex or uncertain problems

---

## Skill Activation Rules

Skills are located in `.claude/skills/`.

Agents must automatically invoke skills based on task type.

---

### planner
Use when:
- Task is non-trivial
- Architecture decisions exist
- Requirements are unclear

---

### debugger
Use when:
- Bug reports exist
- Tests are failing
- Behavior is unexpected

---

### reviewer
Use when:
- Task is complete
- Before marking work done

---

### test-writer
Use when:
- New logic is added
- Existing logic is modified

---

### db-designer
Use when:
- Schema or relationships change

---

### api-designer
Use when:
- Creating or modifying API routes

---

### refactorer
Use when:
- Improving structure without changing behavior

---

### grill-me
Use when:
- Stress-testing plans
- Requirements are unclear or high-risk

---

### frontend-design
Use when:
- Building UI components or pages
- Design quality is critical

---

If multiple skills apply, use them in sequence.

---

## Anti-Patterns

Avoid:

- Starting implementation without planning (when required)
- Ignoring established patterns
- Making assumptions about system behavior
- Silent error handling
- Hardcoding values instead of constants
- Bypassing validation or type safety

---

## File Responsibilities

CLAUDE.md:
- Execution rules and workflows

ARCHITECTURE.md:
- System design and structure

STANDARDS.md:
- Coding, testing, and security rules

---

## Objective

Produce code that is:

- Correct
- Secure
- Testable
- Maintainable
- Reusable

This repository is the template for future projects.