// GET  /api/automations — list all automation rules
// POST /api/automations — create a new automation rule
//
// Auth: requires a valid Clerk session. POST requires member+ role.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { listAutomationRules, createAutomationRule } from '@/lib/db/automations';
import { AutomationRuleSchema } from '@/lib/validations/automations';
import { guardMember } from '@/lib/auth/roles';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { data, error } = await listAutomationRules();
    if (error) return apiError(error, 500);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/automations]', err);
    return apiError('Failed to load automation rules', 500);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = AutomationRuleSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const user = await currentUser();
    const createdBy = user?.id ?? 'unknown';

    const { data, error } = await createAutomationRule(parsed.data, createdBy);
    if (error) return apiError(error, 500);

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/automations]', err);
    return apiError('Failed to create automation rule', 500);
  }
}
