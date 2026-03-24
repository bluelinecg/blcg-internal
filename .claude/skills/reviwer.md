---
name: reviewer
description: Perform strict code and PR reviews against all project standards.
---

This skill reviews code for correctness, consistency, and adherence to rules.

---

## Review Scope

Check against:

- CLAUDE.md (execution rules)
- ARCHITECTURE.md (structure and patterns)
- STANDARDS.md (coding, testing, security)

---

## Review Checklist

### Architecture

- Is code placed in the correct folder?
- Are patterns followed (e.g. /lib/db for queries)?
- Any violation of system structure?

---

### Standards

- No use of `any`
- Proper typing everywhere
- No console.log or dead code
- Proper error handling
- Zod validation used where required

---

### Testing

- Tests exist for new logic
- Tests cover behavior, not implementation
- Edge cases included
- No real services called

---

### Security

- Auth checked server-side
- No sensitive data exposed
- Parameterized queries used
- Input validation present

---

### Simplicity

- Is the solution unnecessarily complex?
- Is there a more direct approach?

---

## Output Format

Provide:

### Issues
- List of problems with file:line references

### Suggestions
- Concrete improvements

### Verdict
- Approve or request changes

---

## Rules

- Be strict
- Do not ignore small violations
- Do not approve incomplete work

---

## Goal

Ensure production-grade quality before merge.