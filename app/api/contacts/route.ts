// GET  /api/contacts — list contacts (paginated, sortable, filterable by organizationId)
// POST /api/contacts — create a contact
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listContacts, createContact } from '@/lib/db/contacts';
import { ContactSchema } from '@/lib/validations/contacts';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { logAction } from '@/lib/utils/audit';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, total: null, error: 'Unauthorised' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const options = parseListParams(searchParams);
    const organizationId = searchParams.get('organizationId') ?? undefined;

    const { data, total, error } = await listContacts({ ...options, organizationId });
    if (error) return NextResponse.json({ data: null, total: null, error }, { status: 500 });

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/contacts]', err);
    return NextResponse.json({ data: null, total: null, error: 'Failed to load contacts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = ContactSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await createContact(parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    if (data) {
      void dispatchWebhookEvent('contact.created', data as unknown as Record<string, unknown>);
      void logAction({ entityType: 'contact', entityId: data.id, entityLabel: `${data.firstName} ${data.lastName}`, action: 'created' });
    }

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/contacts]', err);
    return NextResponse.json({ data: null, error: 'Failed to create contact' }, { status: 500 });
  }
}
