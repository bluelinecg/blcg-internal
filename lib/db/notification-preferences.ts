// Database query functions for notification_preferences.
// All functions use serverClient() (service role, bypasses RLS).
// Call these only from server-side code — API routes, Server Actions, or async Server Components.

import { serverClient } from '@/lib/db/supabase';
import type { NotificationPreferences } from '@/lib/types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/types/notifications';

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Returns the notification preferences for a user.
 * If no row exists yet, returns DEFAULT_NOTIFICATION_PREFERENCES without inserting.
 */
export async function getPreferences(
  userId: string,
): Promise<{ data: NotificationPreferences | null; error: string | null }> {
  try {
    const db = serverClient();
    const { data, error } = await db
      .from('notification_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: { ...DEFAULT_NOTIFICATION_PREFERENCES }, error: null };

    return {
      data: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(data.preferences as Partial<NotificationPreferences>) },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Creates or updates the notification preferences for a user.
 */
export async function upsertPreferences(
  userId: string,
  prefs: NotificationPreferences,
): Promise<{ error: string | null }> {
  try {
    const db = serverClient();
    const { error } = await db
      .from('notification_preferences')
      .upsert(
        { user_id: userId, preferences: prefs },
        { onConflict: 'user_id' },
      );

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
