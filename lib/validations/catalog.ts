import { z } from 'zod';

export const CatalogItemSchema = z.object({
  name:        z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  unitPrice:   z.number().min(0, 'Unit price must be 0 or greater'),
  category:    z.string().optional(),
  isActive:    z.boolean().default(true),
});

export const UpdateCatalogItemSchema = CatalogItemSchema.partial();

export type CatalogItemInput = z.infer<typeof CatalogItemSchema>;
export type UpdateCatalogItemInput = z.infer<typeof UpdateCatalogItemSchema>;
