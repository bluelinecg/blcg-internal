// TypeScript types for the Notification System.
// Notification     — a single in-app notification record.
// NotificationPreferences — per-user toggle settings.

export type NotificationType =
  | 'new_proposal'
  | 'proposal_accepted'
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'new_email'
  | 'task_due'
  | 'weekly_digest'
  | 'automation';

export interface Notification {
  id:         string;
  userId:     string;
  type:       NotificationType;
  title:      string;
  body:       string;
  entityType: string | null;
  entityId:   string | null;
  isRead:     boolean;
  createdAt:  string;
}

export interface NotificationPreferences {
  newProposal:      boolean;
  proposalAccepted: boolean;
  invoicePaid:      boolean;
  invoiceOverdue:   boolean;
  newEmail:         boolean;
  taskDue:          boolean;
  weeklyDigest:     boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  newProposal:      true,
  proposalAccepted: true,
  invoicePaid:      true,
  invoiceOverdue:   true,
  newEmail:         false,
  taskDue:          true,
  weeklyDigest:     true,
};
