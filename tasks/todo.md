# Plan: Build Automation Engine (Trigger → Action System)

## Context

Branch: `feature/automation-engine`

Goal: User-configurable rules engine — "When X happens → do Y" — covering
pipelines, tasks, and proposals, including time-based SLA triggers. Rules are
managed from a dedicated Automations page and surfaced inline on the pipeline
kanban board. No behavior changes to existing features except wiring the two
existing TODOs in the tasks route.

---

## Architecture

**Rule = Trigger + (optional Conditions) + Actions**

Two execution paths:
1. **Event-based** — fire-and-forget from API routes (same pattern as audit log)
2. **Time-based (SLA/scheduled)** — Vercel Cron calls
   `/api/automations/process-scheduled` hourly

---

## Trigger Types

### Event-based
| Trigger | When |
|---------|------|
| `pipeline.item_stage_changed` | Item moves to a new stage |
| `task.status_changed` | Task status changes |
| `task.completed` | Task status → `done` specifically |
| `proposal.status_changed` | Proposal status changes |

### Time-based
| Trigger | When | trigger_config shape |
|---------|------|----------------------|
| `sla.stage_time_exceeded` | Item in stage > threshold | `{ pipelineId, stageId, thresholdHours }` |
| `sla.task_overdue` | Task past due date | `{ thresholdHours, priority? }` |
| `schedule.daily` | Daily at configured time | `{ time: "09:00", timezone }` |

---

## Action Types

| Type | Config |
|------|--------|
| `create_task` | title (supports `{{item.title}}`), description, assigneeId, priority, dueOffset |
| `move_to_stage` | stageId |
| `update_status` | status |
| `assign_user` | userId |
| `send_notification` | message, recipientId (stub — logs intent) |
| `send_email` | subject, body, recipientId (stub — logs intent) |

---

## SLA Deduplication

- `sla.stage_time_exceeded`: skip if `automation_run_log` has a `success` row for
  `(rule_id, entity_id)` where `executed_at > pipeline_stage_history.entered_stage_at`
- `sla.task_overdue`: skip if `success` row exists for `(rule_id, entity_id)` within
  last N hours
- `schedule.daily`: skip if `success` row exists within last 23 hours

---

## Plan

### Step 1 — DB Migration
- [ ] Create `supabase/migrations/20260324010000_automation_engine.sql`
  - `automation_rules` table (id, name, description, is_active, trigger_type,
    trigger_config jsonb, conditions jsonb, actions jsonb, created_by, timestamps)
  - `automation_run_log` table (id, rule_id FK cascade, trigger_type, entity_id,
    trigger_data jsonb, status text, error_message, actions_executed jsonb, executed_at)
  - Index on `(trigger_type)` where `is_active = true` for rules
  - Index on `(rule_id, entity_id, executed_at desc)` for dedup queries
  - RLS: member+ can insert/update rules; admin-only delete; admin-only read for run log

### Step 2 — Types, Constants, Validations
- [ ] Create `lib/types/automations.ts`
  - `AutomationTriggerType` union
  - `Condition` interface (`field`, `operator`, `value`)
  - `AutomationAction` interface (`type`, `config`)
  - `AutomationRule` interface (maps DB columns to camelCase)
  - `AutomationRunLog` interface
  - `AutomationRunStatus`: `'success' | 'failed' | 'skipped'`
- [ ] Create `lib/constants/automations.ts`
  - `TRIGGER_TYPES` — display labels keyed by `AutomationTriggerType`
  - `ACTION_TYPES` — display labels keyed by action type string
  - `CONDITION_OPERATORS`: `'is' | 'is_not'`
  - `CONDITION_FIELDS` — list of filterable fields per trigger category
- [ ] Create `lib/validations/automations.ts`
  - `ConditionSchema` — Zod
  - `AutomationActionSchema` — Zod
  - `AutomationRuleSchema` — full create schema
  - `UpdateAutomationRuleSchema` — `.partial()`
  - Export inferred types `AutomationRuleInput`, `UpdateAutomationRuleInput`

### Step 3 — DB Layer
- [ ] Create `lib/db/automations.ts`
  - `listAutomationRules()` — all rules, ordered by name
  - `getAutomationRuleById(id)` — single rule
  - `listActiveRulesByTrigger(triggerType)` — for engine dispatch
  - `createAutomationRule(input, createdBy)` — insert
  - `updateAutomationRule(id, input)` — update
  - `deleteAutomationRule(id)` — delete
  - `insertRunLog(entry)` — write execution record
  - `getRunsForRule(ruleId, limit?)` — last N runs for a rule
  - `getLastRunForEntity(ruleId, entityId)` — dedup query
- [ ] Write tests `lib/db/automations.test.ts` — mock `serverClient()`, test
  each function returns typed data or error string

### Step 4 — Engine
- [ ] Create `lib/automations/conditions.ts`
  - `evaluateConditions(conditions, triggerData)` — pure function, no DB calls
  - Returns `boolean`
- [ ] Create `lib/automations/actions.ts`
  - `executeAction(action, triggerData)` — calls existing lib/db functions
  - Handles all 6 action types; stubs log for `send_notification` / `send_email`
  - Returns `{ type, status, error? }` summary
- [ ] Create `lib/automations/engine.ts`
  - `runAutomations(triggerType, triggerData)` — fire-and-forget safe (catches
    all errors, never crashes caller)
  - Queries active rules, evaluates conditions, executes actions in order
  - Writes one `automation_run_log` row per rule evaluated
- [ ] Write tests:
  - `lib/automations/conditions.test.ts` — pure function, no mocks needed
  - `lib/automations/actions.test.ts` — mock lib/db functions
  - `lib/automations/engine.test.ts` — mock DB + conditions + actions

### Step 5 — API Routes + Tests
- [ ] Create `app/api/automations/route.ts` — GET (list) / POST (create)
- [ ] Create `app/api/automations/[id]/route.ts` — GET / PATCH / DELETE
- [ ] Create `app/api/automations/[id]/runs/route.ts` — GET run history
- [ ] Create `app/api/automations/process-scheduled/route.ts`
  - Protected by `CRON_SECRET` env var header check
  - Queries all active SLA + scheduled rules
  - Fetches candidate entities, applies dedup, calls `runAutomations`
  - Returns `{ rulesChecked, entitiesEvaluated, actionsTriggered }`
- [ ] Write tests for all 4 route files

### Step 6 — Cron Job + vercel.json
- [ ] Update `vercel.json` — add `crons` array with hourly schedule for
  `/api/automations/process-scheduled`

### Step 7 — Integration Points (fire engine from existing routes)
- [ ] Update `app/api/pipelines/[id]/items/[itemId]/route.ts` PATCH
  - Detect stage change (compare `parsed.data.stageId` vs existing item `stageId`)
  - Fire `void runAutomations('pipeline.item_stage_changed', { ... })`
  - Add webhook dispatch for `pipeline.item_stage_changed` while here
- [ ] Update `lib/types/webhooks.ts` — add `'pipeline.item_stage_changed'` to
  `WebhookEventType`
- [ ] Update `app/api/tasks/[id]/route.ts` PATCH
  - Fire `void runAutomations('task.status_changed', { ... })` alongside existing
    webhook dispatch
  - Fire `void runAutomations('task.completed', { ... })` when `status === 'done'`
  - Remove the TODO comment; keep `createNextRecurrence` call unchanged (automation
    engine is additive, not a replacement for the recurrence logic)
- [ ] Update `app/api/proposals/[id]/route.ts` PATCH
  - Fire `void runAutomations('proposal.status_changed', { ... })` alongside
    existing webhook dispatch

### Step 8 — UI
- [ ] Create `app/(dashboard)/automations/page.tsx`
  - PageShell + PageHeader with "New Rule" button (admin/member visible)
  - Table: Name | Trigger | Active toggle | Actions count | Last run | Edit / Delete
  - Inline `is_active` toggle via PATCH
  - Expandable run history row (last 5 runs per rule)
  - Delete with `ConfirmDialog` (no blockers — always deletable)
  - Empty state with explanatory copy
- [ ] Create `components/modules/AutomationRuleFormModal.tsx`
  - Multi-section form (`Modal` size="xl")
  - Section 1: Name, Description, Active toggle
  - Section 2: Trigger type Select + dynamic config fields per type
  - Section 3: Conditions — add/remove rows of [field] [operator] [value]
  - Section 4: Actions — add/remove rows of [action type] + dynamic config
  - Uses `useFormState` for base fields; manages conditions/actions as local arrays
- [ ] Update `components/layout/Sidebar.tsx`
  - Add Automations nav item (admin-only, same pattern as Finances)
  - Use bolt/lightning icon (Heroicons)

### Step 9 — Pipeline Integration
- [ ] Add Automations tab to pipeline detail page
  - Shows all active rules scoped to that pipeline
  - "New Rule" pre-populates `pipelineId` in trigger config
- [ ] Show ⚡ bolt icon on stage columns that have at least one active rule

### Step 10 — Final Review
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Run `npx jest` — all tests pass
- [ ] Reviewer skill

---

## Risks

- `runAutomations` must never throw — wrap body in `try/catch` and log errors
  (same pattern as `logAction` in `lib/utils/audit.ts`)
- SLA dedup must check against current stage occupancy, not all-time — use
  `entered_stage_at` from pipeline item record
- `process-scheduled` route must be protected; Vercel injects `CRON_SECRET`
  automatically as the `Authorization` header — check `Bearer ${process.env.CRON_SECRET}`
- Template variables (`{{item.title}}`) in action config must be resolved before
  DB writes — handle in `executeAction`, not in the modal

## Open Questions

None — requirements are clear from the plan.

---

## Phase 2 — Inbound Webhooks

Deferred from Phase 1. Enables external systems to POST events into BLCG and trigger
automation rules — completing the event-driven loop.

### Architecture

```
External system → POST /api/webhooks/receive/[slug]
                    ↓ verify HMAC signature
                    ↓ normalize payload
                    ↓ runAutomations('external.webhook_received', normalizedData)
                    ↓ automation rules execute internal actions
```

### New trigger type

Add `'external.webhook_received'` to `AutomationTriggerType`.
`trigger_config` shape: `{ inboundEndpointId, sourceLabel?, expectedEvent? }`

### DB changes

- New table `inbound_webhook_endpoints`:
  `(id, name, slug uuid unique, secret, source_label, is_active, created_by, timestamps)`
- The existing `webhook_endpoints` table is outbound-only — no schema change needed.
  If a unified view is ever desired, add a `direction` column at that time.
- Add index on `slug` for fast lookup on receive route.
- RLS: admin-only create/delete; member read.

### New API route

`app/api/webhooks/receive/[slug]/route.ts` — POST only
- No Clerk session (unauthenticated public endpoint)
- Auth via `X-BLCG-Signature: sha256=<hmac>` header check
- Verify signature with stored secret using `crypto.timingSafeEqual`
- Parse body, normalize to `{ source, event, payload }` shape
- Call `void runAutomations('external.webhook_received', normalizedData)`
- Always return 200 immediately (async processing — never block the sender)
- Rate limit: check request count by slug within 60s window before processing

### Payload normalization

Each inbound endpoint can optionally store a `field_map` jsonb column mapping
external payload fields to BLCG-standard condition fields (e.g. `status → proposal.status`).
Without a map, raw payload is passed as-is to conditions.

### Security requirements (beyond current engine)

- HMAC-SHA256 signature verification (timing-safe comparison)
- Replay attack protection: reject if `X-BLCG-Timestamp` header is >5 minutes old
- Rate limiting per slug (e.g. max 100 req/min) — implement via Supabase counter or
  Vercel Edge middleware
- Secrets never returned after creation (same pattern as outbound webhook secrets)

### UI additions

- Settings → Webhooks tab: add "Inbound" sub-section alongside existing "Outbound"
- Shows generated receive URL (`/api/webhooks/receive/[slug]`) + copy button
- Signing secret shown once on creation
- `AutomationRuleFormModal`: add `external.webhook_received` to trigger type options
  with endpoint selector dropdown

### Risks

- Public unauthenticated endpoint — rate limiting and signature verification are
  non-negotiable before shipping
- Payload normalization complexity varies by source — ship with pass-through first,
  add field mapping UI later
- Must return 200 immediately; never let automation execution time block the sender
