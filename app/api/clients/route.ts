// GET  /api/clients — list clients (paginated, sortable)
// POST /api/clients — create a new client
//
// Auth: requires a valid Clerk session on both methods.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listClients, createClient } from '@/lib/db/clients';
import { ClientSchema } from '@/lib/validations/clients';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';

// GET /api/clients
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, total: null, error: 'Unauthorised' }, { status: 401 });
    }

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listClients(options);
    if (error) {
      return NextResponse.json({ data: null, total: null, error }, { status: 500 });
    }

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/clients]', err);
    return NextResponse.json({ data: null, total: null, error: 'Failed to load clients' }, { status: 500 });
  }
}

// POST /api/clients
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = ClientSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await createClient(parsed.data);
    if (error) {
      return NextResponse.json({ data: null, error }, { status: 500 });
    }

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/clients]', err);
    return NextResponse.json({ data: null, error: 'Failed to create client' }, { status: 500 });
  }
}
