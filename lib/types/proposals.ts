export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

export interface ProposalLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Proposal {
  id: string;
  clientId: string;
  title: string;
  status: ProposalStatus;
  lineItems: ProposalLineItem[];
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
  validUntil?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}
