import { requireAuth, apiOk, apiError } from '@/lib/api/utils';
import { markRead, markUnread, deleteNotification } from '@/lib/db/notifications';
import { PatchNotificationSchema } from '@/lib/validations/notifications';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body: unknown = await request.json();
  const parsed = PatchNotificationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid request body', 400);

  const { error } = parsed.data.isRead
    ? await markRead(id, auth.userId)
    : await markUnread(id, auth.userId);

  if (error) return apiError(error, 500);
  return apiOk(null);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { error } = await deleteNotification(id, auth.userId);

  if (error) return apiError(error, 500);
  return apiOk(null);
}
