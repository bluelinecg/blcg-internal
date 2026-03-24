// GET  /api/users — list all Clerk users with their BLCG role
// POST /api/users — send an email invitation with a pre-assigned role
//
// Auth: requires a valid Clerk session. Only 'owner' or 'admin' roles
// may call these endpoints — enforced via currentUser() publicMetadata.
//
// Note: for lower-latency role checks at scale, configure the Clerk
// Dashboard JWT template to include publicMetadata in session claims,
// then switch to `(await auth()).sessionClaims?.metadata?.role`.

import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { AppUser, UserRole } from '@/lib/types/users';
import { InviteUserSchema } from '@/lib/validations/users';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

const ALLOWED_ROLES: UserRole[] = ['owner', 'admin'];

// GET /api/users
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const caller = await currentUser();
    const callerRole = caller?.publicMetadata?.role as UserRole | undefined;
    if (!callerRole || !ALLOWED_ROLES.includes(callerRole)) {
      return apiError('Forbidden', 403);
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

    return apiOk(users);
  } catch (error) {
    console.error('[GET /api/users]', error);
    return apiError('Failed to load users', 500);
  }
}

// POST /api/users — invite a new user by email with a pre-assigned role
export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const caller = await currentUser();
    const callerRole = caller?.publicMetadata?.role as UserRole | undefined;
    if (!callerRole || !ALLOWED_ROLES.includes(callerRole)) {
      return apiError('Forbidden', 403);
    }

    const parsed = InviteUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { email, role } = parsed.data;

    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role },
      redirectUrl: 'https://admin.bluelinecg.com/sign-up',
    });

    return apiOk({ id: invitation.id }, 201);
  } catch (error) {
    console.error('[POST /api/users]', error);
    return apiError('Failed to send invitation', 500);
  }
}
