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
  createdAt: string;
  updatedAt: string;
}
