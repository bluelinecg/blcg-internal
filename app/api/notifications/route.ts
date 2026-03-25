import { requireAuth, apiOk, apiError } from '@/lib/api/utils';
import { listNotifications, getUnreadCount, insertNotification } from '@/lib/db/notifications';
import { InsertNotificationSchema } from '@/lib/validations/notifications';
import { NextResponse } from 'next/server';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const [notifResult, countResult] = await Promise.all([
    listNotifications(auth.userId),
    getUnreadCount(auth.userId),
  ]);

  if (notifResult.error) return apiError(notifResult.error, 500);

  return apiOk({
    notifications: notifResult.data ?? [],
    unreadCount:   countResult.count,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body: unknown = await request.json();
  const parsed = InsertNotificationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid request body', 400);

  const { data, error } = await insertNotification({
    userId: auth.userId,
    ...parsed.data,
  });

  if (error) return apiError(error, 500);
  return apiOk(data, 201);
}
