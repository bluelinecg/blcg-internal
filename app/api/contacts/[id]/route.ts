// GET    /api/contacts/[id] — fetch a single contact
// PATCH  /api/contacts/[id] — update a contact
// DELETE /api/contacts/[id] — delete a contact (no dependency restrictions)
//
// Auth: requires a valid Clerk session. DELETE requires admin role.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { getContactById, updateContact, deleteContact } from '@/lib/db/contacts';
import { UpdateContactSchema } from '@/lib/validations/contacts';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { bus } from '@/lib/events';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { data, error } = await getContactById(id);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Contact not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/contacts/[id]]', err);
    return apiError('Failed to load contact', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateContactSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateContact(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Contact not found', 404);

    const isStatusChange = parsed.data.status !== undefined;
    void bus.publish('contact.updated', {
      actorId:     userId,
      entityType:  'contact',
      entityId:    id,
      entityLabel: `${data.firstName} ${data.lastName}`,
      action:      isStatusChange ? 'status_changed' : 'updated',
      data:        data as unknown as Record<string, unknown>,
      metadata:    isStatusChange ? { to: data.status } : undefined,
    });

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/contacts/[id]]', err);
    return apiError('Failed to update contact', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    // Fetch entity label before deletion for audit log
    const { data: contact } = await getContactById(id);

    const { error } = await deleteContact(id);
    if (error) return apiError(error, 500);

    void bus.publish('contact.deleted', {
      actorId:     userId,
      entityType:  'contact',
      entityId:    id,
      entityLabel: contact ? `${contact.firstName} ${contact.lastName}` : id,
      action:      'deleted',
      data:        contact as unknown as Record<string, unknown> ?? { id },
    });

    return apiOk({ id });
  } catch (err) {
    console.error('[DELETE /api/contacts/[id]]', err);
    return apiError('Failed to delete contact', 500);
  }
}
