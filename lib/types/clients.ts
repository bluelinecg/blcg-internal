export type ClientStatus = 'active' | 'inactive' | 'prospect';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: ClientStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
