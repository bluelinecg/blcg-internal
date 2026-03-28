# BLCG Engineering Standards (Consolidated)

This document defines all required coding, architecture, testing, security, and delivery standards.

Agents must follow all rules strictly when planning, implementing, and reviewing code.

---

## 🔷 Core Architecture Rules (NON-NEGOTIABLE)

- No direct database access outside `/lib/db`
- All inputs must use Zod validation from `/lib/validations`
- All API responses must follow: `{ data, error }`
- No use of `any` type (strict typing required)
- No business logic inside `/components/ui`
- All environment variables must come from `/lib/config`

---

## 🔷 Execution Protocol (MANDATORY)

Every task must follow this workflow:

1. **Planner** – break task into steps  
2. **Implementation** – write code  
3. **Test Writer** – create/expand tests  
4. **Reviewer** – validate against all standards  

---

## 🔷 Task Context (Injected at Runtime)
TASK: {{title}}
DESCRIPTION: {{description}}
TYPE: {{type}}
MODULE: {{module}}
EPIC: {{epic}}


### Requirements

- Respect all `blocked_by` dependencies before starting  
- Do not proceed if dependencies are incomplete  
- Ensure full type safety (no `any`)  
- Handle all edge cases and error states  
- Ensure modular, reusable implementation  

### Acceptance Criteria

- Feature works as described  
- Fully typed and Zod validated  
- Respects architecture boundaries  
- Includes tests  
- Passes all review checks  

### Output Format

- Step-by-step plan  
- Implementation  
- Tests  
- Final validation checklist  

---

## 🔷 Engineering Standards

### TypeScript

- Strict mode enabled  
- Explicit types required  
- Use interfaces for component props  
- Use types for unions and primitives  

---

### Code Quality

- All async functions must include error handling  
- No `console.log` in committed code  
- No commented-out or dead code  
- Keep implementations simple (avoid over-engineering)  
- Remove unused code  

---

### Components

- Named exports only  
- One component per file  
- Props must be typed  
- No business logic in UI components  

---

### Naming Conventions

- Components: PascalCase  
- Files & folders: kebab-case  

---

### Styling

- Tailwind CSS only  
- No inline styles  
- No CSS modules  

---

## 🔷 Mobile Responsiveness (REQUIRED)

All UI must be mobile-responsive at implementation.

### Breakpoints

- 375px — mobile (minimum)  
- 768px — tablet  
- 1280px — desktop  

### Rules

- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)  
- No hardcoded widths (use `w-full sm:w-auto`)  
- Always include mobile-first layouts (e.g. `grid-cols-1 sm:grid-cols-2`)  
- Tables must use `overflow-x-auto`  
- Modals must be full-width on mobile  
- Touch targets ≥ 44px height  
- No horizontal scroll or clipped UI at 375px  

---

## 🔷 Testing (MANDATORY)

### Coverage

- `/lib` functions  
- UI components  
- Critical user flows  

### Tools

- Unit: Jest  
- Component: React Testing Library  
- E2E: Playwright  

### Rules

- Tests must be co-located  
- Test behavior, not implementation  
- Mock all external services  
- Do not skip tests  

### Completion

- Tests written and passing  
- No external services called  

---

## 🔷 Reliability

All features must include:

- Loading state  
- Error state  
- Empty state  
- Logged errors  
- No silent failures  

---

## 🔷 Security

- Validate all inputs (Zod required)  
- Enforce server-side authentication  
- Use parameterized queries  
- Never expose secrets or sensitive data  
- Do not trust client input  

---

## 🔷 Performance & Cost Control

- Use server components by default  
- Paginate all list queries  
- Avoid unnecessary data fetching  
- Minimize API calls  
- Avoid polling when possible  

---

## 🔷 Maintainability

- Keep code simple and modular  
- Avoid over-engineering  
- Remove unused or duplicate logic  

---

## 🔷 Definition of Done

A task is complete only if:

- All standards are followed  
- Tests are written and passing  
- No debug or unused code remains  
- CI checks pass  
- Changes are documented  

---

## 🔷 Design Standards

- Follow frontend-design guidelines when applicable  
- Maintain consistency with existing UI patterns  
- Do not introduce conflicting design systems  