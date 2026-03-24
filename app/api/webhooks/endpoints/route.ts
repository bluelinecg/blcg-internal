// GET  /api/webhooks/endpoints — list all webhook endpoints
// POST /api/webhooks/endpoints — register a new endpoint
//
// Auth: requires admin role (webhook management is admin-only).
// Response shape: { data: T | null, error: string | null }

import { randomBytes } from 'crypto';
import { listWebhookEndpoints, createWebhookEndpoint } from '@/lib/db/webhooks';
import { WebhookEndpointSchema } from '@/lib/validations/webhooks';
import { guardAdmin } from '@/lib/auth/roles';
import { apiError, apiOk } from '@/lib/api/utils';

export async function GET() {
  try {
    const guard = await guardAdmin();
    if (guard) return guard;

    const { data, error } = await listWebhookEndpoints();
    if (error) return apiError(error, 500);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/webhooks/endpoints]', err);
    return apiError('Failed to load webhook endpoints', 500);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await guardAdmin();
    if (guard) return guard;

    const parsed = WebhookEndpointSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    // Generate a cryptographically random signing secret (32 bytes = 64 hex chars).
    const secret = randomBytes(32).toString('hex');

    const { data, error } = await createWebhookEndpoint(parsed.data, secret);
    if (error) return apiError(error, 500);

    // Return the full endpoint including the secret — this is the only time it is exposed.
    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/webhooks/endpoints]', err);
    return apiError('Failed to create webhook endpoint', 500);
  }
}
