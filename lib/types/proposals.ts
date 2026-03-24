import type { Contact } from './crm';

// 'declined' maps to 'rejected' in legacy mock data — DB uses 'declined'
export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

export interface ProposalLineItem {
  id: string;
  proposalId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sortOrder: number;
}

export interface Proposal {
  id: string;
  clientId: string;
  proposalNumber: string;        // BL-YYYY-NNN
  title: string;
  status: ProposalStatus;
  situation?: string;            // free-text description of client situation
  totalValue: number;
  depositAmount?: number;
  // Agreement fields — populated when proposal is accepted and agreement is signed
  agreementSignedAt?: string;
  agreementStartDate?: string;
  agreementEstimatedEndDate?: string;
  governingState?: string;
  lineItems: ProposalLineItem[];
  notes?: string;
  sentAt?: string;
  expiresAt?: string;
  // CRM link — contact from the client's linked organization
  contactId?: string;
  contact?: Contact;
  createdAt: string;
  updatedAt: string;
}
