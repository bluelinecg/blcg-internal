// GET  /api/users — list all Clerk users with their BLCG role
// POST /api/users — send an email invitation with a pre-assigned role
//
// Auth: requires a valid Clerk session. Only 'owner' or 'admin' roles
// may call these endpoints — enforced via currentUser() publicMetadata.
//
// Note: for lower-latency role checks at scale, configure the Clerk
// Dashboard JWT template to include publicMetadata in session claims,
// then switch to `(await auth()).sessionClaims?.metadata?.role`.

import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { AppUser, UserRole } from '@/lib/types/users';

const ALLOWED_ROLES: UserRole[] = ['owner', 'admin'];

// GET /api/users
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const caller = await currentUser();
    const callerRole = caller?.publicMetadata?.role as UserRole | undefined;
    if (!callerRole || !ALLOWED_ROLES.includes(callerRole)) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
    }

    const client = await clerkClient();
    const { data: clerkUsers } = await client.users.getUserList({ limit: 100 });

    const users: AppUser[] = clerkUsers.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.emailAddresses[0]?.emailAddress ?? '',
      imageUrl: u.imageUrl,
      role: (u.publicMetadata?.role as UserRole) ?? 'member',
      createdAt: new Date(u.createdAt).toISOString(),
      lastSignInAt: u.lastSignInAt ? new Date(u.lastSignInAt).toISOString() : null,
    }));

    return NextResponse.json({ data: users, error: null });
  } catch (error) {
    console.error('[GET /api/users]', error);
    return NextResponse.json({ data: null, error: 'Failed to load users' }, { status: 500 });
  }
}

// POST /api/users — invite a new user by email with a pre-assigned role
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const caller = await currentUser();
    const callerRole = caller?.publicMetadata?.role as UserRole | undefined;
    if (!callerRole || !ALLOWED_ROLES.includes(callerRole)) {
      return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as { email?: string; role?: UserRole };

    if (!body.email?.trim()) {
      return NextResponse.json({ data: null, error: 'Email is required' }, { status: 400 });
    }
    if (!body.role) {
      return NextResponse.json({ data: null, error: 'Role is required' }, { status: 400 });
    }

    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress: body.email.trim(),
      publicMetadata: { role: body.role },
      redirectUrl: 'https://admin.bluelinecg.com/sign-up',
    });

    return NextResponse.json({ data: { id: invitation.id }, error: null }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/users]', error);
    return NextResponse.json({ data: null, error: 'Failed to send invitation' }, { status: 500 });
  }
}
