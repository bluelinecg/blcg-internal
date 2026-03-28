import { z } from 'zod';

export const AuditEntityTypeSchema = z.enum([
  'client',
  'contact',
  'organization',
  'proposal',
  'project',
  'task',
  'invoice',
  'expense',
  'pipeline_item',
  'catalog_item',
  'time_entry',
]);

export const AuditLogQuerySchema = z.object({
  entityType: AuditEntityTypeSchema.optional(),
  entityId:   z.string().uuid('entityId must be a valid UUID').optional(),
}).refine(
  (data) => {
    // If one is provided, both must be provided
    const hasType = data.entityType !== undefined;
    const hasId   = data.entityId !== undefined;
    return hasType === hasId;
  },
  { message: 'entityType and entityId must be provided together', path: ['entityId'] },
);

export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;
