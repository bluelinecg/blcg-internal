'use client';

// Users management page — lists all Clerk users, allows role changes,
// user removal (with guards), and sending new invitations.
// Data is fetched from /api/users on mount and re-fetched after mutations.
// TODO: replace fetch calls with /lib/db/users.ts once that layer exists.

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Button, Card, Select, Spinner, ConfirmDialog } from '@/components/ui';
import { InviteUserModal } from '@/components/modules';
import type { AppUser, UserRole } from '@/lib/types/users';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'owner',  label: 'Owner' },
  { value: 'admin',  label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  owner:  'bg-purple-100 text-purple-700',
  admin:  'bg-brand-blue/10 text-brand-blue',
  member: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-600',
};

export function UsersPage() {
  const { user: currentUser } = useUser();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);

  // Remove confirmation state
  const [removeTarget, setRemoveTarget] = useState<AppUser | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Per-user role update state (tracks in-flight userId)
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/users');
      const json = (await res.json()) as { data: AppUser[] | null; error: string | null };
      if (!res.ok || json.error) {
        setLoadError(json.error ?? 'Failed to load users.');
        return;
      }
      setUsers(json.data ?? []);
    } catch {
      setLoadError('Network error. Could not load users.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdatingRoleFor(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const json = (await res.json()) as { data: unknown; error: string | null };
      if (!res.ok || json.error) {
        // Surface error inline without crashing the page
        console.error('[handleRoleChange]', json.error);
        return;
      }
      // Optimistically update the local list
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
    } catch {
      console.error('[handleRoleChange] network error');
    } finally {
      setUpdatingRoleFor(null);
    }
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) return;
    setIsRemoving(true);
    setRemoveError(null);
    try {
      const res = await fetch(`/api/users/${removeTarget.id}`, { method: 'DELETE' });
      const json = (await res.json()) as { data: unknown; error: string | null };
      if (!res.ok || json.error) {
        setRemoveError(json.error ?? 'Failed to remove user.');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch {
      setRemoveError('Network error. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Users"
        subtitle={isLoading ? 'Loading…' : `${users.length} team member${users.length !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={() => setInviteOpen(true)}>+ Invite User</Button>
        }
      />

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      )}

      {/* Load error */}
      {!isLoading && loadError && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-sm text-red-600">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={loadUsers}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !loadError && users.length === 0 && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-sm text-gray-400">No team members yet.</p>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              Invite the first user
            </Button>
          </div>
        </Card>
      )}

      {/* Users table */}
      {!isLoading && !loadError && users.length > 0 && (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Last Sign-in
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => {
                const isCurrentUser = u.id === currentUser?.id;
                const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unknown';
                const initials = getInitials(fullName);
                const isUpdatingRole = updatingRoleFor === u.id;

                return (
                  <tr key={u.id} className="transition-colors hover:bg-gray-50">
                    {/* Avatar + name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.imageUrl}
                            alt={fullName}
                            className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-semibold text-brand-blue">
                            {initials}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{fullName}</span>
                          {isCurrentUser && (
                            <span className="text-xs text-gray-400">You</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>

                    {/* Role — inline select for admin/owner, badge for current user */}
                    <td className="px-6 py-4">
                      {isCurrentUser ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE_CLASS[u.role]}`}>
                          {u.role}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Select
                            options={ROLE_OPTIONS}
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            disabled={isUpdatingRole}
                            className="w-28 text-sm"
                          />
                          {isUpdatingRole && <Spinner size="sm" />}
                        </div>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatShortDate(u.createdAt)}
                    </td>

                    {/* Last sign-in */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {u.lastSignInAt ? formatShortDate(u.lastSignInAt) : '—'}
                    </td>

                    {/* Remove */}
                    <td className="px-6 py-4 text-right">
                      {!isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemoveTarget(u)}
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Invite modal */}
      <InviteUserModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={loadUsers}
      />

      {/* Remove confirmation */}
      <ConfirmDialog
        isOpen={removeTarget !== null}
        onClose={() => { setRemoveTarget(null); setRemoveError(null); }}
        onConfirm={handleRemoveConfirm}
        title="Remove User"
        description={
          removeTarget
            ? `Remove ${[removeTarget.firstName, removeTarget.lastName].filter(Boolean).join(' ') || removeTarget.email} from the team? They will lose access immediately.`
            : ''
        }
        confirmLabel={isRemoving ? 'Removing…' : 'Remove User'}
        blockedBy={removeError ? [removeError] : []}
      />
    </PageShell>
  );
}

export default UsersPage;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
