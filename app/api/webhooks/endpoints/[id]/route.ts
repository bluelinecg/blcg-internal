// DELETE /api/webhooks/endpoints/[id] — remove a webhook endpoint
//
// Auth: requires admin role.
// Deliveries are cascade-deleted by the database foreign key constraint.
// Response shape: { data: null, error: string | null }

import { deleteWebhookEndpoint } from '@/lib/db/webhooks';
import { guardAdmin } from '@/lib/auth/roles';
import { apiError, apiOk } from '@/lib/api/utils';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;
    const { error } = await deleteWebhookEndpoint(id);
    if (error) return apiError(error, 500);

    return apiOk(null);
  } catch (err) {
    console.error('[DELETE /api/webhooks/endpoints/[id]]', err);
    return apiError('Failed to delete webhook endpoint', 500);
  }
}
