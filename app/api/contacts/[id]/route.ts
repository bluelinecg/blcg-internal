// GET    /api/contacts/[id] — fetch a single contact
// PATCH  /api/contacts/[id] — update a contact
// DELETE /api/contacts/[id] — delete a contact (no dependency restrictions)
//
// Auth: requires a valid Clerk session. DELETE requires admin role.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getContactById, updateContact, deleteContact } from '@/lib/db/contacts';
import { UpdateContactSchema } from '@/lib/validations/contacts';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { logAction } from '@/lib/utils/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await params;
    const { data, error } = await getContactById(id);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Contact not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/contacts/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to load contact' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateContactSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await updateContact(id, parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Contact not found' }, { status: 404 });

    const contactLabel = `${data.firstName} ${data.lastName}`;
    void dispatchWebhookEvent('contact.updated', data as unknown as Record<string, unknown>);
    void logAction({
      entityType: 'contact',
      entityId: id,
      entityLabel: contactLabel,
      action: parsed.data.status !== undefined ? 'status_changed' : 'updated',
      metadata: parsed.data.status !== undefined ? { to: data.status } : undefined,
    });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[PATCH /api/contacts/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to update contact' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    // Fetch entity label before deletion for audit log
    const { data: contact } = await getContactById(id);

    const { error } = await deleteContact(id);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    const contactLabel = contact ? `${contact.firstName} ${contact.lastName}` : id;
    void logAction({ entityType: 'contact', entityId: id, entityLabel: contactLabel, action: 'deleted' });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    console.error('[DELETE /api/contacts/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to delete contact' }, { status: 500 });
  }
}
