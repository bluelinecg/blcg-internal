import { requireAuth, apiOk, apiError } from '@/lib/api/utils';
import { getPreferences, upsertPreferences } from '@/lib/db/notification-preferences';
import { NotificationPreferencesSchema } from '@/lib/validations/notifications';
import { NextResponse } from 'next/server';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await getPreferences(auth.userId);
  if (error) return apiError(error, 500);
  return apiOk(data);
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body: unknown = await request.json();
  const parsed = NotificationPreferencesSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid request body', 400);

  const { error } = await upsertPreferences(auth.userId, parsed.data);
  if (error) return apiError(error, 500);
  return apiOk(null);
}
