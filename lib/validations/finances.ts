import { z } from 'zod';

export const InvoiceStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'paid',
  'overdue',
  'cancelled',
]);

export const ExpenseCategorySchema = z.enum([
  'software',
  'contractors',
  'marketing',
  'equipment',
  'travel',
  'office',
  'other',
]);

export const InvoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity:    z.number().positive('Quantity must be greater than zero'),
  unitPrice:   z.number().nonnegative('Unit price cannot be negative'),
  total:       z.number().nonnegative('Total cannot be negative'),
});

export const InvoiceSchema = z.object({
  clientId:      z.string().min(1, 'Client is required'),
  projectId:     z.string().optional(),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  status:        InvoiceStatusSchema,
  lineItems:     z.array(InvoiceLineItemSchema).min(1, 'At least one line item is required'),
  subtotal:      z.number().nonnegative(),
  tax:           z.number().nonnegative().optional(),
  total:         z.number().nonnegative(),
  dueDate:       z.string().datetime({ offset: true }),
  paidDate:      z.string().datetime({ offset: true }).optional(),
  notes:         z.string().optional(),
});

export const UpdateInvoiceSchema = InvoiceSchema.partial();

export const ExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  category:    ExpenseCategorySchema,
  amount:      z.number().positive('Amount must be greater than zero'),
  projectId:   z.string().optional(),
  vendor:      z.string().optional(),
  date:        z.string().datetime({ offset: true }),
  notes:       z.string().optional(),
});

export const UpdateExpenseSchema = ExpenseSchema.partial();

export type InvoiceLineItemInput = z.infer<typeof InvoiceLineItemSchema>;
export type InvoiceInput = z.infer<typeof InvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
export type ExpenseInput = z.infer<typeof ExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
