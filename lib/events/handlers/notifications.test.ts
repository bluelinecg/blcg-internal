import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationsHandler } from './notifications';
import type { DomainEventPayload } from '../types';

vi.mock('@/lib/utils/notify-user', () => ({
  notifyIfEnabled: vi.fn().mockResolvedValue(undefined),
}));

import { notifyIfEnabled } from '@/lib/utils/notify-user';

const userId = 'user_clerk_123';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('notificationsHandler — proposal.created', () => {
  it('sends newProposal notification', async () => {
    const payload: DomainEventPayload = {
      actorId:     userId,
      entityType:  'proposal',
      entityId:    'prop-uuid',
      entityLabel: 'Website Redesign',
      action:      'created',
      data:        { id: 'prop-uuid', title: 'Website Redesign' },
    };

    await notificationsHandler('proposal.created', payload);

    expect(notifyIfEnabled).toHaveBeenCalledWith(userId, 'newProposal', {
      type:       'new_proposal',
      title:      'New Proposal Created',
      body:       'Proposal "Website Redesign" has been created.',
      entityType: 'proposal',
      entityId:   'prop-uuid',
    });
  });
});

describe('notificationsHandler — proposal.status_changed', () => {
  it('sends proposalAccepted notification when newStatus is accepted', async () => {
    const payload: DomainEventPayload = {
      actorId:     userId,
      entityType:  'proposal',
      entityId:    'prop-uuid',
      entityLabel: 'Website Redesign',
      action:      'status_changed',
      data:        { id: 'prop-uuid', title: 'Website Redesign', status: 'accepted' },
      metadata:    { newStatus: 'accepted' },
    };

    await notificationsHandler('proposal.status_changed', payload);

    expect(notifyIfEnabled).toHaveBeenCalledWith(userId, 'proposalAccepted', {
      type:       'proposal_accepted',
      title:      'Proposal Accepted',
      body:       'Proposal "Website Redesign" has been accepted.',
      entityType: 'proposal',
      entityId:   'prop-uuid',
    });
  });

  it('sends no notification when status is not accepted', async () => {
    const payload: DomainEventPayload = {
      actorId:     userId,
      entityType:  'proposal',
      entityId:    'prop-uuid',
      entityLabel: 'Proposal',
      action:      'status_changed',
      data:        { id: 'prop-uuid', title: 'Proposal', status: 'sent' },
      metadata:    { newStatus: 'sent' },
    };

    await notificationsHandler('proposal.status_changed', payload);

    expect(notifyIfEnabled).not.toHaveBeenCalled();
  });
});

describe('notificationsHandler — invoice.status_changed', () => {
  it('sends invoicePaid notification when newStatus is paid', async () => {
    const payload: DomainEventPayload = {
      actorId:     userId,
      entityType:  'invoice',
      entityId:    'inv-uuid',
      entityLabel: 'INV-001',
      action:      'status_changed',
      data:        { id: 'inv-uuid', invoiceNumber: 'INV-001', status: 'paid' },
      metadata:    { newStatus: 'paid' },
    };

    await notificationsHandler('invoice.status_changed', payload);

    expect(notifyIfEnabled).toHaveBeenCalledWith(userId, 'invoicePaid', {
      type:       'invoice_paid',
      title:      'Invoice Paid',
      body:       'Invoice INV-001 has been marked as paid.',
      entityType: 'invoice',
      entityId:   'inv-uuid',
    });
  });

  it('sends invoiceOverdue notification when newStatus is overdue', async () => {
    const payload: DomainEventPayload = {
      actorId:     userId,
      entityType:  'invoice',
      entityId:    'inv-uuid',
      entityLabel: 'INV-002',
      action:      'status_changed',
      data:        { id: 'inv-uuid', invoiceNumber: 'INV-002', status: 'overdue' },
      metadata:    { newStatus: 'overdue' },
    };

    await notificationsHandler('invoice.status_changed', payload);

    expect(notifyIfEnabled).toHaveBeenCalledWith(userId, 'invoiceOverdue', {
      type:       'invoice_overdue',
      title:      'Invoice Overdue',
      body:       'Invoice INV-002 is now overdue.',
      entityType: 'invoice',
      entityId:   'inv-uuid',
    });
  });

  it('sends no notification for non-trigger statuses', async () => {
    const payload: DomainEventPayload = {
      actorId:     userId,
      entityType:  'invoice',
      entityId:    'inv-uuid',
      entityLabel: 'INV-003',
      action:      'status_changed',
      data:        { id: 'inv-uuid', invoiceNumber: 'INV-003', status: 'sent' },
      metadata:    { newStatus: 'sent' },
    };

    await notificationsHandler('invoice.status_changed', payload);

    expect(notifyIfEnabled).not.toHaveBeenCalled();
  });
});

describe('notificationsHandler — unrelated events', () => {
  it('sends no notification for contact.created', async () => {
    const payload: DomainEventPayload = {
      actorId:     userId,
      entityType:  'contact',
      entityId:    'contact-uuid',
      entityLabel: 'Jane Smith',
      action:      'created',
      data:        { id: 'contact-uuid' },
    };

    await notificationsHandler('contact.created', payload);

    expect(notifyIfEnabled).not.toHaveBeenCalled();
  });
});
