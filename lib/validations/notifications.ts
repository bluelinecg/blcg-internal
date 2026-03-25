import { z } from 'zod';

// ---------------------------------------------------------------------------
// Insert notification
// ---------------------------------------------------------------------------
export const InsertNotificationSchema = z.object({
  type:       z.enum(['new_proposal', 'proposal_accepted', 'invoice_paid', 'invoice_overdue', 'new_email', 'task_due', 'weekly_digest', 'automation']),
  title:      z.string().min(1, 'Title is required').max(200),
  body:       z.string().min(1, 'Body is required').max(1000),
  entityType: z.string().max(50).optional(),
  entityId:   z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Patch notification (mark read / unread)
// ---------------------------------------------------------------------------
export const PatchNotificationSchema = z.object({
  isRead: z.boolean(),
});

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------
export const NotificationPreferencesSchema = z.object({
  newProposal:      z.boolean(),
  proposalAccepted: z.boolean(),
  invoicePaid:      z.boolean(),
  invoiceOverdue:   z.boolean(),
  newEmail:         z.boolean(),
  taskDue:          z.boolean(),
  weeklyDigest:     z.boolean(),
});

// ---------------------------------------------------------------------------
// Inferred input types
// ---------------------------------------------------------------------------
export type InsertNotificationInput   = z.infer<typeof InsertNotificationSchema>;
export type PatchNotificationInput    = z.infer<typeof PatchNotificationSchema>;
export type NotificationPrefsInput    = z.infer<typeof NotificationPreferencesSchema>;
