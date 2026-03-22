import { z } from 'zod';

export const ProposalStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
]);

export const LineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity:    z.number().positive('Quantity must be greater than zero'),
  unitPrice:   z.number().nonnegative('Unit price cannot be negative'),
  total:       z.number().nonnegative('Total cannot be negative'),
});

export const ProposalSchema = z.object({
  clientId:   z.string().min(1, 'Client is required'),
  title:      z.string().min(1, 'Title is required'),
  status:     ProposalStatusSchema,
  lineItems:  z.array(LineItemSchema).min(1, 'At least one line item is required'),
  subtotal:   z.number().nonnegative(),
  tax:        z.number().nonnegative().optional(),
  total:      z.number().nonnegative(),
  notes:      z.string().optional(),
  validUntil: z.string().datetime({ offset: true }).optional(),
  sentAt:     z.string().datetime({ offset: true }).optional(),
});

export const UpdateProposalSchema = ProposalSchema.partial();

export type LineItemInput = z.infer<typeof LineItemSchema>;
export type ProposalInput = z.infer<typeof ProposalSchema>;
export type UpdateProposalInput = z.infer<typeof UpdateProposalSchema>;
