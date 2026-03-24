import { z } from 'zod';

export const WebhookEventTypeSchema = z.enum([
  'contact.created',
  'contact.updated',
  'organization.created',
  'task.created',
  'task.status_changed',
  'proposal.status_changed',
]);

export const WebhookEndpointSchema = z.object({
  url:         z.string().url('Must be a valid URL'),
  description: z.string().optional(),
  events:      z.array(WebhookEventTypeSchema).min(1, 'Select at least one event'),
});

export type WebhookEndpointInput = z.infer<typeof WebhookEndpointSchema>;
