# Notification System — Implementation Plan

## Status: Awaiting Approval

## Overview
Build a first-party in-app notification system with per-user preferences, an unread badge in the top nav, a dropdown panel, and a full history page. Preferences are stored in Supabase and replace the existing mock state in Settings > Notifications. The automation engine's `send_notification` stub is wired to `insertNotification()` so automations can deliver real in-app alerts.

## Risks & Unknowns
- `TopNav` is `'use client'` but has no data fetching today — a simple `useEffect` + fetch on mount for badge count is fine for v1; no realtime subscription needed.
- `send_notification` action config currently only has `message` and `recipientId`. For v1, `recipientId` targets the user who created the rule; broaden later.
- `notification_preferences` defaults are handled in the DB layer — return `DEFAULT_NOTIFICATION_PREFERENCES` on first read (no row yet); upsert on first save.
- Migration timestamp: `20260325000000` (after last migration `20260324010000`).

## Steps

### Phase 1: Database
- [ ] Write `supabase/migrations/20260325000000_notifications.sql`
  - `notifications` table: `id uuid PK`, `user_id text not null`, `type text not null`, `title text not null`, `body text not null`, `entity_type text`, `entity_id uuid`, `is_read bool not null default false`, `created_at timestamptz not null default now()`
  - `notification_preferences` table: `id uuid PK`, `user_id text not null unique`, `preferences jsonb not null default '{}'`, `updated_at timestamptz not null default now()`
  - `set_updated_at()` trigger on `notification_preferences`
  - Composite index on `notifications (user_id, is_read, created_at DESC)`
  - RLS enabled on both tables; policies scoped to `user_id = auth.jwt() ->> 'sub'`
- [ ] Run migration in Supabase dashboard

### Phase 2: Types & Validation
- [ ] Create `lib/types/notifications.ts`
  - `NotificationType` union: `'new_proposal' | 'proposal_accepted' | 'invoice_paid' | 'invoice_overdue' | 'new_email' | 'task_due' | 'weekly_digest' | 'automation'`
  - `Notification` interface
  - `NotificationPreferences` interface (seven boolean keys matching existing mock)
  - `DEFAULT_NOTIFICATION_PREFERENCES` constant
- [ ] Create `lib/validations/notifications.ts`
  - `InsertNotificationSchema`, `PatchNotificationSchema`, `NotificationPreferencesSchema`

### Phase 3: DB Layer
- [ ] Create `lib/db/notifications.ts`
  - `listNotifications(userId, options?)`, `getUnreadCount(userId)`, `markRead(id, userId)`, `markUnread(id, userId)`, `markAllRead(userId)`, `deleteNotification(id, userId)`, `insertNotification(input)`
- [ ] Create `lib/db/notification-preferences.ts`
  - `getPreferences(userId)` — returns defaults if no row exists
  - `upsertPreferences(userId, prefs)`

### Phase 4: API Routes
- [ ] `app/api/notifications/route.ts` — GET (list + unread count), POST (insert)
- [ ] `app/api/notifications/[id]/route.ts` — PATCH (mark read/unread), DELETE
- [ ] `app/api/notifications/mark-all-read/route.ts` — POST
- [ ] `app/api/notifications/preferences/route.ts` — GET, PUT

### Phase 5: UI
- [ ] Update `components/layout/TopNav.tsx` — bell icon with unread badge, opens `NotificationDropdown`
- [ ] Create `components/modules/NotificationDropdown.tsx` — recent 10, mark read, delete, mark all read, "View all" link, close on outside click
- [ ] Update `NotificationsTab` in `app/(dashboard)/settings/page.tsx` — wire to real preferences API, replace mock state
- [ ] Create `app/(dashboard)/notifications/page.tsx` — full history, All/Unread filter, bulk mark-all-read

### Phase 6: Automation Integration
- [ ] Update `send_notification` case in `lib/automations/actions.ts` — call `insertNotification()`, resolve `userId` from `recipientId` config or trigger context, map `message` → `body`

### Phase 7: Tests
- [ ] `lib/db/notifications.test.ts`
- [ ] `lib/db/notification-preferences.test.ts`
- [ ] `app/api/notifications/route.test.ts`
- [ ] `app/api/notifications/[id]/route.test.ts`
- [ ] `app/api/notifications/preferences/route.test.ts`

## Verification
- [ ] All API routes return correct `{ data, error }` shapes
- [ ] Bell badge updates on new notification
- [ ] Mark read/unread persists and reflects in UI without full reload
- [ ] Delete removes notification immediately (optimistic update)
- [ ] Preferences survive a page refresh
- [ ] Automation `send_notification` action creates a real notification row
- [ ] `npx tsc --noEmit` passes
- [ ] `npx jest` passes
