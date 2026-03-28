// GET  /api/clients — list clients (paginated, sortable)
// POST /api/clients — create a new client
//
// Auth: requires a valid Clerk session on both methods.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { NextResponse } from 'next/server';
import { listClients, createClient } from '@/lib/db/clients';
import { ClientSchema } from '@/lib/validations/clients';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { bus } from '@/lib/events';
import { requireAuth, apiError, apiOk, apiList } from '@/lib/api/utils';

// GET /api/clients
export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listClients(options);
    if (error) return apiError(error, 500);

    return apiList(data, total);
  } catch (err) {
    console.error('[GET /api/clients]', err);
    return apiError('Failed to load clients', 500);
  }
}

// POST /api/clients
export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = ClientSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createClient(parsed.data);
    if (error) return apiError(error, 500);

    if (data) {
      void bus.publish('client.created', {
        actorId:     userId,
        entityType:  'client',
        entityId:    data.id,
        entityLabel: data.name,
        action:      'created',
        data:        data as unknown as Record<string, unknown>,
      });
    }

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/clients]', err);
    return apiError('Failed to create client', 500);
  }
}
