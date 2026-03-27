// Utility: notifyIfEnabled
// Checks a user's notification preferences before inserting a notification.
// Always call as `void notifyIfEnabled(...)` — fire-and-forget like webhook dispatch.

import { getPreferences } from '@/lib/db/notification-preferences';
import { insertNotification, type InsertNotificationInput } from '@/lib/db/notifications';
import type { NotificationPreferences } from '@/lib/types/notifications';

export async function notifyIfEnabled(
  userId: string,
  prefKey: keyof NotificationPreferences,
  notification: Omit<InsertNotificationInput, 'userId'>,
): Promise<void> {
  const { data: prefs } = await getPreferences(userId);
  if (!prefs || !prefs[prefKey]) return;
  await insertNotification({ userId, ...notification });
}
