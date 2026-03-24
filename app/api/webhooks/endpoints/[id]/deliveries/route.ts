// GET /api/webhooks/endpoints/[id]/deliveries — last 50 delivery attempts for an endpoint
//
// Auth: requires admin role.
// Response shape: { data: WebhookDelivery[] | null, error: string | null }

import { NextResponse } from 'next/server';
import { listWebhookDeliveries } from '@/lib/db/webhooks';
import { guardAdmin } from '@/lib/auth/roles';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;
    const { data, error } = await listWebhookDeliveries(id);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/webhooks/endpoints/[id]/deliveries]', err);
    return NextResponse.json({ data: null, error: 'Failed to load webhook deliveries' }, { status: 500 });
  }
}
