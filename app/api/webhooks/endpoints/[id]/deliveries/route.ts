// GET /api/webhooks/endpoints/[id]/deliveries — last 50 delivery attempts for an endpoint
//
// Auth: requires admin role.
// Response shape: { data: WebhookDelivery[] | null, error: string | null }

import { listWebhookDeliveries } from '@/lib/db/webhooks';
import { guardAdmin } from '@/lib/auth/roles';
import { apiError, apiOk } from '@/lib/api/utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;
    const { data, error } = await listWebhookDeliveries(id);
    if (error) return apiError(error, 500);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/webhooks/endpoints/[id]/deliveries]', err);
    return apiError('Failed to load webhook deliveries', 500);
  }
}
