import { z } from 'zod';

export const ProposalStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'expired',
]);

export const ProposalLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity:    z.number().positive('Quantity must be greater than zero'),
  unitPrice:   z.number().nonnegative('Unit price cannot be negative'),
  total:       z.number().nonnegative('Total cannot be negative'),
  sortOrder:   z.number().int().nonnegative().optional(),
});

export const ProposalSchema = z.object({
  clientId:                    z.string().uuid().optional(),
  organizationId:              z.string().uuid('Organization is required'),
  proposalNumber:              z.string().optional(),
  title:                       z.string().min(1, 'Title is required'),
  status:                      ProposalStatusSchema,
  situation:                   z.string().optional(),
  totalValue:                  z.number().nonnegative(),
  depositAmount:               z.number().nonnegative().optional(),
  // Agreement fields
  agreementSignedAt:           z.string().datetime({ offset: true }).optional(),
  agreementStartDate:          z.string().optional(),
  agreementEstimatedEndDate:   z.string().optional(),
  governingState:              z.string().optional(),
  lineItems:                   z.array(ProposalLineItemSchema).min(1, 'At least one line item is required'),
  notes:                       z.string().optional(),
  sentAt:                      z.string().datetime({ offset: true }).optional(),
  expiresAt:                   z.string().datetime({ offset: true }).optional(),
  contactId:                   z.string().uuid().optional(),
});

export const UpdateProposalSchema = ProposalSchema.partial();

export type ProposalLineItemInput = z.infer<typeof ProposalLineItemSchema>;
export type ProposalInput = z.infer<typeof ProposalSchema>;
export type UpdateProposalInput = z.infer<typeof UpdateProposalSchema>;
