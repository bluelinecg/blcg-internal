import { z } from 'zod';

export const EmailFolderSchema = z.enum(['inbox', 'sent', 'drafts']);

export const ComposeEmailSchema = z.object({
  from:    z.string().email('Sender address is required'),
  to:      z.array(z.string().email('Enter a valid recipient address')).min(1, 'At least one recipient is required'),
  cc:      z.array(z.string().email('Enter a valid CC address')).optional(),
  subject: z.string().min(1, 'Subject is required'),
  body:    z.string().min(1, 'Body cannot be empty'),
});

export type ComposeEmailInput = z.infer<typeof ComposeEmailSchema>;
