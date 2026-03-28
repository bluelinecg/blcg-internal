// GET  /api/contacts — list contacts (paginated, sortable, filterable by organizationId)
// POST /api/contacts — create a contact
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { NextResponse } from 'next/server';
import { listContacts, createContact } from '@/lib/db/contacts';
import { ContactSchema } from '@/lib/validations/contacts';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { bus } from '@/lib/events';
import { requireAuth, apiError, apiOk, apiList } from '@/lib/api/utils';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const options = parseListParams(searchParams);
    const organizationId = searchParams.get('organizationId') ?? undefined;

    const { data, total, error } = await listContacts({ ...options, organizationId });
    if (error) return apiError(error, 500);

    return apiList(data, total);
  } catch (err) {
    console.error('[GET /api/contacts]', err);
    return apiError('Failed to load contacts', 500);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = ContactSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createContact(parsed.data);
    if (error) return apiError(error, 500);

    if (data) {
      void bus.publish('contact.created', {
        actorId:     userId,
        entityType:  'contact',
        entityId:    data.id,
        entityLabel: `${data.firstName} ${data.lastName}`,
        action:      'created',
        data:        data as unknown as Record<string, unknown>,
      });
    }

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/contacts]', err);
    return apiError('Failed to create contact', 500);
  }
}
