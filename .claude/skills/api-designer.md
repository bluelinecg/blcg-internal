---
name: api-designer
description: Design consistent, validated API routes and interfaces.
---

Use this skill when creating or modifying API routes.

---

## Requirements

- Follow standard response shape:
  { data: T | null, error: string | null }

- Validate all inputs with Zod
- Handle errors explicitly

---

## Process

1. Define endpoint purpose
2. Define request/response shapes
3. Add validation
4. Implement handler

---

## Rules

- No direct DB access outside /lib/db
- Always check authentication
- Never expose sensitive data

---

## Goal

Create consistent, predictable, and secure APIs.