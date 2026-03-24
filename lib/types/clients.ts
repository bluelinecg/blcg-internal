import type { Organization } from './crm';

export type ClientStatus = 'active' | 'inactive' | 'prospect';

export interface Client {
  id: string;
  name: string;
  contactName: string;
  contactTitle?: string;
  email: string;
  phone?: string;
  industry?: string;
  address?: string;
  website?: string;
  referredBy?: string;
  status: ClientStatus;
  notes?: string;
  // CRM links — soft-deprecated flat contact fields in favour of linked org/contacts
  organizationId?: string;
  organization?: Organization;
  createdAt: string;
  updatedAt: string;
}
