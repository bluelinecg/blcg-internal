-- =============================================================================
-- BLCG Internal — Notification System
-- Migration: 20260325000000_notifications
-- =============================================================================
-- notifications              — per-user in-app notification records
-- notification_preferences   — per-user toggle preferences
-- =============================================================================

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  type        text not null,
  title       text not null,
  body        text not null,
  entity_type text,
  entity_id   uuid,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Fast lookup of a user's unread notifications, newest first
create index notifications_user_unread_idx
  on notifications (user_id, is_read, created_at desc);

alter table notifications enable row level security;

-- Users may only access their own notifications (browser-client safety net)
-- All writes are performed via service role from API routes
create policy "Users can read their own notifications"
  on notifications for select
  using (user_id = auth.jwt() ->> 'sub');

create policy "Users can update their own notifications"
  on notifications for update
  using (user_id = auth.jwt() ->> 'sub');

create policy "Users can delete their own notifications"
  on notifications for delete
  using (user_id = auth.jwt() ->> 'sub');

-- ---------------------------------------------------------------------------
-- notification_preferences
-- ---------------------------------------------------------------------------
create table notification_preferences (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null unique,
  preferences  jsonb not null default '{}',
  updated_at   timestamptz not null default now()
);

create trigger notification_preferences_updated_at
  before update on notification_preferences
  for each row execute function set_updated_at();

alter table notification_preferences enable row level security;

create policy "Users can read their own preferences"
  on notification_preferences for select
  using (user_id = auth.jwt() ->> 'sub');

create policy "Users can update their own preferences"
  on notification_preferences for update
  using (user_id = auth.jwt() ->> 'sub');
