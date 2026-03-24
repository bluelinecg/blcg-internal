// GET  /api/organizations — list organizations (paginated, sortable)
// POST /api/organizations — create an organization
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listOrganizations, createOrganization } from '@/lib/db/organizations';
import { OrganizationSchema } from '@/lib/validations/organizations';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, total: null, error: 'Unauthorised' }, { status: 401 });
    }

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listOrganizations(options);
    if (error) return NextResponse.json({ data: null, total: null, error }, { status: 500 });

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/organizations]', err);
    return NextResponse.json({ data: null, total: null, error: 'Failed to load organizations' }, { status: 500 });
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

    const parsed = OrganizationSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await createOrganization(parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    if (data) void dispatchWebhookEvent('organization.created', data as unknown as Record<string, unknown>);

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/organizations]', err);
    return NextResponse.json({ data: null, error: 'Failed to create organization' }, { status: 500 });
  }
}
