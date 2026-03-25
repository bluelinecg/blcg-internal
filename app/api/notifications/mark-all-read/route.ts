import { requireAuth, apiOk, apiError } from '@/lib/api/utils';
import { markAllRead } from '@/lib/db/notifications';
import { NextResponse } from 'next/server';

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { error } = await markAllRead(auth.userId);
  if (error) return apiError(error, 500);
  return apiOk(null);
}
