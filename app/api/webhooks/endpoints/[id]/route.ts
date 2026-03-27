// GET    /api/webhooks/endpoints/[id] — fetch a single webhook endpoint
// PATCH  /api/webhooks/endpoints/[id] — update url, description, events, or isActive
// DELETE /api/webhooks/endpoints/[id] — remove a webhook endpoint
//
// Auth: requires admin role.
// Response shape: { data: T | null, error: string | null }

import { getWebhookEndpoint, updateWebhookEndpoint, deleteWebhookEndpoint } from '@/lib/db/webhooks';
import { WebhookEndpointUpdateSchema } from '@/lib/validations/webhooks';
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
    const { data, error } = await getWebhookEndpoint(id);
    if (error) return apiError(error, 500);
    if (!data)  return apiError('Webhook endpoint not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/webhooks/endpoints/[id]]', err);
    return apiError('Failed to load webhook endpoint', 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await guardAdmin();
    if (guard) return guard;

    const parsed = WebhookEndpointUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { id } = await params;
    const { data, error } = await updateWebhookEndpoint(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data)  return apiError('Webhook endpoint not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/webhooks/endpoints/[id]]', err);
    return apiError('Failed to update webhook endpoint', 500);
  }
}

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
