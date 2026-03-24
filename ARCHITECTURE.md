# BLCG Architecture Guide

This file defines system structure, design patterns, and code organization.

Agents must use this file to determine where code belongs and how systems interact.

---

## System Purpose

This application serves as:

1. Internal operations system for BLCG
2. Base template for all future client applications

All implementations must prioritize reusability and consistency.

---

## Tech Stack

- Next.js 16 (App Router)
- TypeScript (strict mode)
- Tailwind CSS v4
- Supabase (database, storage, realtime)
- Clerk v7 (authentication)
- Vercel (deployment)

---

## Stack Constraints

- Use Next.js 16 conventions only
- Tailwind v4 does not use tailwind.config.ts
- Use clerkMiddleware, not deprecated authMiddleware
- Use React 19 patterns
- Dynamic route params must be awaited (Promise-based)
- Do not modify vercel.json

---

## Folder Structure

/app
  Routing and pages

/components
  /ui
    Reusable primitives (no business logic)
  /modules
    Feature-specific components
  /layout
    Structural components

/lib
  /db
    All database queries
  /integrations
    Third-party clients
  /utils
    Shared utility functions
  /hooks
    Custom React hooks
  /types
    Shared types
  /constants
    Global constants
  /validations
    Zod schemas

---

## Core Patterns

### Database Access

- All queries must exist in /lib/db
- Components must never access Supabase directly

---

### API Response Shape

All API routes must return:

{ data: T | null, error: string | null }

---

### Validation

- All inputs validated with Zod
- Schemas defined in /lib/validations

---

### Authentication

- Managed exclusively by Clerk
- Middleware protects routes
- No custom authentication logic allowed

---

### Environment Variables

- Access only through /lib/config.ts
- Never access process.env directly

---

## Component Design

### UI Components

- Located in /components/ui
- Fully reusable
- No business logic
- Configured via props

### Module Components

- Located in /components/modules
- Compose UI components
- Contain feature-specific logic

---

## Decision Frameworks

### Server vs Client Components

Use server components when:
- Fetching data
- No client-side interactivity required

Use client components when:
- Using state, effects, or browser APIs

---

### Creating New Components

Create a new component only if:
- No existing component satisfies the need
- It is reusable or improves clarity

---

### Utility Functions

Add to /lib/utils if:
- Logic is reusable
- Function is pure or isolated

---

## Data Integrity Rule

Deletion must be blocked if dependencies exist.

Enforcement required at:
1. Frontend
2. API
3. Database

This rule must not be bypassed.

---

## Objective

Maintain a clean, modular architecture that can be extracted into a reusable template.