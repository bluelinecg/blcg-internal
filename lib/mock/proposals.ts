import type { Proposal } from '@/lib/types/proposals';

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'prop_1',
    clientId: 'cl_1',
    proposalNumber: 'BL-2026-001',
    title: 'E-Commerce Redesign — Full Stack Build',
    status: 'accepted',
    lineItems: [
      { id: 'li_1_1', proposalId: 'prop_1', description: 'Discovery & UX Research',   quantity: 1, unitPrice: 1500, total: 1500, sortOrder: 0 },
      { id: 'li_1_2', proposalId: 'prop_1', description: 'UI/UX Design (Figma)',       quantity: 1, unitPrice: 2500, total: 2500, sortOrder: 1 },
      { id: 'li_1_3', proposalId: 'prop_1', description: 'Frontend Development',       quantity: 1, unitPrice: 5000, total: 5000, sortOrder: 2 },
      { id: 'li_1_4', proposalId: 'prop_1', description: 'Backend & API Integration',  quantity: 1, unitPrice: 3000, total: 3000, sortOrder: 3 },
      { id: 'li_1_5', proposalId: 'prop_1', description: 'QA & Launch Support',        quantity: 1, unitPrice:  500, total:  500, sortOrder: 4 },
    ],
    totalValue: 12500,
    depositAmount: 6250,
    agreementSignedAt: '2026-01-22T11:00:00Z',
    agreementStartDate: '2026-02-01',
    agreementEstimatedEndDate: '2026-05-01',
    governingState: 'CO',
    notes: 'Includes 30-day post-launch support window. Payment split 50% upfront, 50% on delivery.',
    sentAt: '2026-01-20T10:00:00Z',
    expiresAt: '2026-02-20T00:00:00Z',
    createdAt: '2026-01-18T09:00:00Z',
    updatedAt: '2026-01-22T11:00:00Z',
  },
  {
    id: 'prop_2',
    clientId: 'cl_2',
    proposalNumber: 'BL-2026-002',
    title: 'CRM Implementation & Staff Training',
    status: 'sent',
    lineItems: [
      { id: 'li_2_1', proposalId: 'prop_2', description: 'Requirements Gathering',        quantity: 1, unitPrice: 1000, total: 1000, sortOrder: 0 },
      { id: 'li_2_2', proposalId: 'prop_2', description: 'CRM Configuration & Setup',     quantity: 1, unitPrice: 3500, total: 3500, sortOrder: 1 },
      { id: 'li_2_3', proposalId: 'prop_2', description: 'Data Migration',                quantity: 1, unitPrice: 1500, total: 1500, sortOrder: 2 },
      { id: 'li_2_4', proposalId: 'prop_2', description: 'Staff Training (2 sessions)',   quantity: 2, unitPrice:  875, total: 1750, sortOrder: 3 },
      { id: 'li_2_5', proposalId: 'prop_2', description: '60-Day Support Retainer',       quantity: 1, unitPrice: 1000, total: 1000, sortOrder: 4 },
    ],
    totalValue: 8750,
    depositAmount: 4375,
    notes: 'Sent after discovery call. Awaiting feedback from Marcus by April 1.',
    sentAt: '2026-03-10T14:00:00Z',
    expiresAt: '2026-04-10T00:00:00Z',
    createdAt: '2026-03-08T10:00:00Z',
    updatedAt: '2026-03-10T14:00:00Z',
  },
  {
    id: 'prop_3',
    clientId: 'cl_3',
    proposalNumber: 'BL-2026-003',
    title: 'SEO Retainer — Q2 2026',
    status: 'accepted',
    lineItems: [
      { id: 'li_3_1', proposalId: 'prop_3', description: 'Monthly SEO Audit & Reporting',       quantity: 3, unitPrice: 600, total: 1800, sortOrder: 0 },
      { id: 'li_3_2', proposalId: 'prop_3', description: 'Content Optimization (4 pages/mo)',   quantity: 3, unitPrice: 200, total:  600, sortOrder: 1 },
    ],
    totalValue: 2400,
    agreementSignedAt: '2026-03-03T10:00:00Z',
    agreementStartDate: '2026-04-01',
    notes: 'Recurring quarterly retainer. Auto-renews unless cancelled 30 days prior.',
    sentAt: '2026-03-01T09:00:00Z',
    expiresAt: '2026-03-15T00:00:00Z',
    createdAt: '2026-02-28T08:00:00Z',
    updatedAt: '2026-03-03T10:00:00Z',
  },
  {
    id: 'prop_4',
    clientId: 'cl_5',
    proposalNumber: 'BL-2026-004',
    title: 'Client Portal with Document Storage',
    status: 'draft',
    lineItems: [
      { id: 'li_4_1', proposalId: 'prop_4', description: 'System Architecture & Planning',     quantity: 1, unitPrice: 2000, total:  2000, sortOrder: 0 },
      { id: 'li_4_2', proposalId: 'prop_4', description: 'Authentication & Role Management',   quantity: 1, unitPrice: 3000, total:  3000, sortOrder: 1 },
      { id: 'li_4_3', proposalId: 'prop_4', description: 'Document Upload & Storage System',   quantity: 1, unitPrice: 4000, total:  4000, sortOrder: 2 },
      { id: 'li_4_4', proposalId: 'prop_4', description: 'Client-Facing Portal UI',            quantity: 1, unitPrice: 5000, total:  5000, sortOrder: 3 },
      { id: 'li_4_5', proposalId: 'prop_4', description: 'Admin Dashboard & Reporting',        quantity: 1, unitPrice: 2500, total:  2500, sortOrder: 4 },
      { id: 'li_4_6', proposalId: 'prop_4', description: 'Security Audit & Compliance Review', quantity: 1, unitPrice: 1500, total:  1500, sortOrder: 5 },
    ],
    totalValue: 18000,
    depositAmount: 9000,
    notes: 'Draft pending final scope confirmation. Tanya requested detailed security documentation.',
    createdAt: '2026-03-15T11:00:00Z',
    updatedAt: '2026-03-20T16:00:00Z',
  },
  {
    id: 'prop_5',
    clientId: 'cl_6',
    proposalNumber: 'BL-2026-005',
    title: 'Brand Identity & Website Package',
    status: 'draft',
    lineItems: [
      { id: 'li_5_1', proposalId: 'prop_5', description: 'Brand Strategy Session',     quantity: 1, unitPrice:  750, total:  750, sortOrder: 0 },
      { id: 'li_5_2', proposalId: 'prop_5', description: 'Logo Design (3 concepts)',   quantity: 1, unitPrice: 1500, total: 1500, sortOrder: 1 },
      { id: 'li_5_3', proposalId: 'prop_5', description: 'Brand Style Guide',          quantity: 1, unitPrice:  800, total:  800, sortOrder: 2 },
      { id: 'li_5_4', proposalId: 'prop_5', description: '5-Page Website Build',       quantity: 1, unitPrice: 1450, total: 1450, sortOrder: 3 },
    ],
    totalValue: 4500,
    notes: 'To be sent after discovery call at end of March.',
    createdAt: '2026-03-05T15:00:00Z',
    updatedAt: '2026-03-05T15:00:00Z',
  },
  {
    id: 'prop_6',
    clientId: 'cl_4',
    proposalNumber: 'BL-2025-001',
    title: 'Website Refresh — Owens Roofing',
    status: 'expired',
    lineItems: [
      { id: 'li_6_1', proposalId: 'prop_6', description: 'Design Refresh (existing structure)', quantity: 1, unitPrice: 1200, total: 1200, sortOrder: 0 },
      { id: 'li_6_2', proposalId: 'prop_6', description: 'Mobile Optimization',                 quantity: 1, unitPrice:  600, total:  600, sortOrder: 1 },
      { id: 'li_6_3', proposalId: 'prop_6', description: 'SEO Meta Updates',                    quantity: 1, unitPrice:  300, total:  300, sortOrder: 2 },
    ],
    totalValue: 2100,
    notes: 'Sent mid-2025 but never accepted. Follow up in June 2026.',
    sentAt: '2025-07-01T10:00:00Z',
    expiresAt: '2025-08-01T00:00:00Z',
    createdAt: '2025-06-28T09:00:00Z',
    updatedAt: '2025-08-02T09:00:00Z',
  },
];

export function getAllProposals(): Proposal[] {
  return MOCK_PROPOSALS;
}

export function getProposalById(id: string): Proposal | undefined {
  return MOCK_PROPOSALS.find((p) => p.id === id);
}

export function getProposalsByClientId(clientId: string): Proposal[] {
  return MOCK_PROPOSALS.filter((p) => p.clientId === clientId);
}
