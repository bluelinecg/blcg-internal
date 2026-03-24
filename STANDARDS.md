# BLCG Engineering Standards

This file defines coding, testing, and security requirements.

Agents must follow these rules when writing or reviewing code.

---

## Hard Standards

- Do not use the `any` type
- Do not access the database outside /lib/db
- All inputs must be validated with Zod
- All async functions must include error handling
- No console.log statements in committed code
- No commented-out code

---

## TypeScript

- Strict mode enabled
- Explicit types required
- Use interfaces for component props
- Use types for unions and primitives

---

## Components

- Named exports only
- One component per file
- Props must be typed
- No business logic in UI components

---

## Naming Conventions

- Components: PascalCase
- Other files: kebab-case
- Folders: kebab-case

---

## Styling

- Tailwind CSS only
- No inline styles
- No CSS modules

---

## Testing Requirements

Testing is mandatory.

### Coverage

Must include:
- /lib functions
- UI components
- Critical user flows

---

### Tools

- Unit tests: Jest
- Component tests: React Testing Library
- End-to-end tests: Playwright

---

### Rules

- Tests must be co-located with source files
- Test behavior, not implementation details
- Mock all external services
- Do not skip tests

---

### Completion Checklist

- Tests written
- Tests passing
- No external services called

---

## Reliability

All features must include:

- Loading state
- Error state
- Empty state
- Logged errors
- No silent failures

---

## Security

Must follow these rules:

- Validate all input data
- Check authentication server-side
- Use parameterized queries
- Do not expose secrets or sensitive data
- Do not trust client input

---

## Performance

- Use server components by default
- Paginate all list queries
- Avoid unnecessary data fetching

---

## Cost Control

- Avoid excessive API calls
- Do not implement polling when avoidable

---

## Maintainability

- Keep implementations simple
- Avoid over-engineering
- Remove unused code

---

## Definition of Done

A task is not complete until:

- Code follows all standards
- Tests are written and passing
- No debug code remains
- CI checks pass
- Changes are documented

## Design Work

When performing frontend design:

- Follow the frontend-design skill if applicable
- Maintain consistency with existing UI patterns
- Do not introduce inconsistent design systems