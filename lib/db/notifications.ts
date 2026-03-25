// Database query functions for the notifications module.
// All functions use serverClient() (service role, bypasses RLS).
// Call these only from server-side code — API routes, Server Actions, or async Server Components.

import { serverClient } from '@/lib/db/supabase';
import type { Notification, NotificationType } from '@/lib/types/notifications';

// ---------------------------------------------------------------------------
// Row type (mirrors DB columns)
// ---------------------------------------------------------------------------

interface NotificationRow {
  id:          string;
  user_id:     string;
  type:        string;
  title:       string;
  body:        string;
  entity_type: string | null;
  entity_id:   string | null;
  is_read:     boolean;
  created_at:  string;
}

// ---------------------------------------------------------------------------
// Mapping helper
// ---------------------------------------------------------------------------

function fromRow(row: NotificationRow): Notification {
  return {
    id:         row.id,
    userId:     row.user_id,
    type:       row.type as NotificationType,
    title:      row.title,
    body:       row.body,
    entityType: row.entity_type,
    entityId:   row.entity_id,
    isRead:     row.is_read,
    createdAt:  row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Insert input type
// ---------------------------------------------------------------------------

export interface InsertNotificationInput {
  userId:      string;
  type:        NotificationType;
  title:       string;
  body:        string;
  entityType?: string;
  entityId?:   string;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export async function insertNotification(
  input: InsertNotificationInput,
): Promise<{ data: Notification | null; error: string | null }> {
  try {
    const db = serverClient();
    const { data, error } = await db
      .from('notifications')
      .insert({
        user_id:     input.userId,
        type:        input.type,
        title:       input.title,
        body:        input.body,
        entity_type: input.entityType ?? null,
        entity_id:   input.entityId ?? null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromRow(data as NotificationRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function listNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {},
): Promise<{ data: Notification[] | null; error: string | null }> {
  try {
    const limit = options.limit ?? 50;
    const db = serverClient();

    let query = db
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options.unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data as NotificationRow[]).map(fromRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getUnreadCount(
  userId: string,
): Promise<{ count: number; error: string | null }> {
  try {
    const db = serverClient();
    const { count, error } = await db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) return { count: 0, error: error.message };
    return { count: count ?? 0, error: null };
  } catch (err) {
    return { count: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Mark read / unread
// ---------------------------------------------------------------------------

export async function markRead(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  try {
    const db = serverClient();
    const { error } = await db
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function markUnread(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  try {
    const db = serverClient();
    const { error } = await db
      .from('notifications')
      .update({ is_read: false })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function markAllRead(
  userId: string,
): Promise<{ error: string | null }> {
  try {
    const db = serverClient();
    const { error } = await db
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteNotification(
  id: string,
  userId: string,
): Promise<{ error: string | null }> {
  try {
    const db = serverClient();
    const { error } = await db
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
