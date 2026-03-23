// PATCH  /api/users/[id] — update a user's role
// DELETE /api/users/[id] — remove a user from the application
//
// Auth: requires 'owner' or 'admin' role.
// Guard: cannot remove yourself; cannot remove the last owner.

import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { UserRole } from '@/lib/types/users';
import { UpdateRoleSchema } from '@/lib/validations/users';

const ALLOWED_ROLES: UserRole[] = ['owner', 'admin'];

// PATCH /api/users/[id] — change a user's role
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    const parsed = UpdateRoleSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { role } = parsed.data;

    const client = await clerkClient();
    await client.users.updateUser(id, { publicMetadata: { role } });

    return NextResponse.json({ data: { id, role }, error: null });
  } catch (error) {
    console.error('[PATCH /api/users/[id]]', error);
    return NextResponse.json({ data: null, error: 'Failed to update role' }, { status: 500 });
  }
}

// DELETE /api/users/[id] — remove a user
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    // Prevent self-removal
    if (id === userId) {
      return NextResponse.json(
        { data: null, error: 'You cannot remove your own account' },
        { status: 400 },
      );
    }

    // Prevent removing the last owner
    const client = await clerkClient();
    const targetUser = await client.users.getUser(id);
    const targetRole = targetUser.publicMetadata?.role as UserRole | undefined;

    if (targetRole === 'owner') {
      const { data: allUsers } = await client.users.getUserList({ limit: 100 });
      const ownerCount = allUsers.filter(
        (u) => (u.publicMetadata?.role as UserRole) === 'owner',
      ).length;
      if (ownerCount <= 1) {
        return NextResponse.json(
          { data: null, error: 'Cannot remove the last owner' },
          { status: 400 },
        );
      }
    }

    await client.users.deleteUser(id);
    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    console.error('[DELETE /api/users/[id]]', error);
    return NextResponse.json({ data: null, error: 'Failed to remove user' }, { status: 500 });
  }
}
