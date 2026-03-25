// GET    /api/automations/[id] — fetch a single automation rule
// PATCH  /api/automations/[id] — update a rule (partial update)
// DELETE /api/automations/[id] — delete a rule (admin only)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { getAutomationRuleById, updateAutomationRule, deleteAutomationRule } from '@/lib/db/automations';
import { UpdateAutomationRuleSchema } from '@/lib/validations/automations';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { data, error } = await getAutomationRuleById(id);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Automation rule not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/automations/[id]]', err);
    return apiError('Failed to load automation rule', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateAutomationRuleSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateAutomationRule(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Automation rule not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/automations/[id]]', err);
    return apiError('Failed to update automation rule', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    const { error } = await deleteAutomationRule(id);
    if (error) return apiError(error, 500);

    return apiOk({ id });
  } catch (err) {
    console.error('[DELETE /api/automations/[id]]', err);
    return apiError('Failed to delete automation rule', 500);
  }
}
