import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditHandler } from './audit';
import type { DomainEventPayload } from '../types';

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

vi.mock('@/lib/db/audit-log', () => ({
  insertLog: vi.fn(),
}));

import { currentUser } from '@clerk/nextjs/server';
import { insertLog } from '@/lib/db/audit-log';

const mockUser = {
  id:             'user_clerk_123',
  firstName:      'Ryan',
  lastName:       'Matthews',
  emailAddresses: [{ emailAddress: 'ryan@example.com' }],
};

const payload: DomainEventPayload = {
  actorId:     'user_clerk_123',
  entityType:  'contact',
  entityId:    'contact-uuid',
  entityLabel: 'Jane Smith',
  action:      'created',
  data:        { id: 'contact-uuid' },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(currentUser).mockResolvedValue(mockUser as ReturnType<typeof currentUser> extends Promise<infer T> ? T : never);
  vi.mocked(insertLog).mockResolvedValue({ error: null });
});

describe('auditHandler', () => {
  it('calls insertLog with resolved actor name and payload data', async () => {
    await auditHandler('contact.created', payload);

    expect(insertLog).toHaveBeenCalledWith({
      entityType:  'contact',
      entityId:    'contact-uuid',
      entityLabel: 'Jane Smith',
      action:      'created',
      actorId:     'user_clerk_123',
      actorName:   'Ryan Matthews',
      metadata:    undefined,
    });
  });

  it('falls back to email when name fields are empty', async () => {
    vi.mocked(currentUser).mockResolvedValue({
      ...mockUser,
      firstName: '',
      lastName:  '',
    } as ReturnType<typeof currentUser> extends Promise<infer T> ? T : never);

    await auditHandler('contact.created', payload);

    expect(insertLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorName: 'ryan@example.com' }),
    );
  });

  it('passes metadata through to insertLog', async () => {
    const payloadWithMeta: DomainEventPayload = {
      ...payload,
      action:   'status_changed',
      metadata: { to: 'accepted', newStatus: 'accepted' },
    };

    await auditHandler('contact.updated', payloadWithMeta);

    expect(insertLog).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { to: 'accepted', newStatus: 'accepted' } }),
    );
  });

  it('returns early without calling insertLog when currentUser returns null', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    await auditHandler('contact.created', payload);

    expect(insertLog).not.toHaveBeenCalled();
  });

  it('logs an error when insertLog returns an error but does not throw', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(insertLog).mockResolvedValue({ error: 'DB write failed' });

    await expect(auditHandler('contact.created', payload)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[EventBus/audit]'),
      'DB write failed',
    );

    errorSpy.mockRestore();
  });
});
