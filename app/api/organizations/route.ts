// GET  /api/organizations — list organizations (paginated, sortable)
// POST /api/organizations — create an organization
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { NextResponse } from 'next/server';
import { listOrganizations, createOrganization } from '@/lib/db/organizations';
import { OrganizationSchema } from '@/lib/validations/organizations';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { logAction } from '@/lib/utils/audit';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listOrganizations(options);
    if (error) return apiError(error, 500);

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/organizations]', err);
    return apiError('Failed to load organizations', 500);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = OrganizationSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createOrganization(parsed.data);
    if (error) return apiError(error, 500);

    if (data) {
      void dispatchWebhookEvent('organization.created', data as unknown as Record<string, unknown>);
      void logAction({ entityType: 'organization', entityId: data.id, entityLabel: data.name, action: 'created' });
    }

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/organizations]', err);
    return apiError('Failed to create organization', 500);
  }
}
