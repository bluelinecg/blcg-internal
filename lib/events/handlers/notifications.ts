// Event Bus handler: in-app notifications.
// Checks per-user preferences and inserts notifications for specific domain events.
// Uses payload.actorId as the recipient userId (the acting user is notified of their own actions).

import { notifyIfEnabled } from '@/lib/utils/notify-user';
import type { EventHandler } from '../types';

export const notificationsHandler: EventHandler = async (eventName, payload) => {
  const { actorId, entityId, data, metadata } = payload;
  const newStatus = metadata?.newStatus as string | undefined;

  if (eventName === 'proposal.created') {
    await notifyIfEnabled(actorId, 'newProposal', {
      type:       'new_proposal',
      title:      'New Proposal Created',
      body:       `Proposal "${data.title as string}" has been created.`,
      entityType: 'proposal',
      entityId,
    });
    return;
  }

  if (eventName === 'proposal.status_changed' && newStatus === 'accepted') {
    await notifyIfEnabled(actorId, 'proposalAccepted', {
      type:       'proposal_accepted',
      title:      'Proposal Accepted',
      body:       `Proposal "${data.title as string}" has been accepted.`,
      entityType: 'proposal',
      entityId,
    });
    return;
  }

  if (eventName === 'invoice.status_changed' && newStatus === 'paid') {
    await notifyIfEnabled(actorId, 'invoicePaid', {
      type:       'invoice_paid',
      title:      'Invoice Paid',
      body:       `Invoice ${data.invoiceNumber as string} has been marked as paid.`,
      entityType: 'invoice',
      entityId,
    });
    return;
  }

  if (eventName === 'invoice.status_changed' && newStatus === 'overdue') {
    await notifyIfEnabled(actorId, 'invoiceOverdue', {
      type:       'invoice_overdue',
      title:      'Invoice Overdue',
      body:       `Invoice ${data.invoiceNumber as string} is now overdue.`,
      entityType: 'invoice',
      entityId,
    });
  }
};
