import type { Proposal } from '@/lib/types/proposals';

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'prop_1',
    clientId: 'cl_1',
    title: 'E-Commerce Redesign — Full Stack Build',
    status: 'accepted',
    lineItems: [
      { id: 'li_1_1', description: 'Discovery & UX Research', quantity: 1, unitPrice: 1500, total: 1500 },
      { id: 'li_1_2', description: 'UI/UX Design (Figma)', quantity: 1, unitPrice: 2500, total: 2500 },
      { id: 'li_1_3', description: 'Frontend Development', quantity: 1, unitPrice: 5000, total: 5000 },
      { id: 'li_1_4', description: 'Backend & API Integration', quantity: 1, unitPrice: 3000, total: 3000 },
      { id: 'li_1_5', description: 'QA & Launch Support', quantity: 1, unitPrice: 500, total: 500 },
    ],
    subtotal: 12500,
    total: 12500,
    notes: 'Includes 30-day post-launch support window. Payment split 50% upfront, 50% on delivery.',
    sentAt: '2026-01-20T10:00:00Z',
    validUntil: '2026-02-20T00:00:00Z',
    createdAt: '2026-01-18T09:00:00Z',
    updatedAt: '2026-01-22T11:00:00Z',
  },
  {
    id: 'prop_2',
    clientId: 'cl_2',
    title: 'CRM Implementation & Staff Training',
    status: 'sent',
    lineItems: [
      { id: 'li_2_1', description: 'Requirements Gathering', quantity: 1, unitPrice: 1000, total: 1000 },
      { id: 'li_2_2', description: 'CRM Configuration & Setup', quantity: 1, unitPrice: 3500, total: 3500 },
      { id: 'li_2_3', description: 'Data Migration', quantity: 1, unitPrice: 1500, total: 1500 },
      { id: 'li_2_4', description: 'Staff Training (2 sessions)', quantity: 2, unitPrice: 875, total: 1750 },
      { id: 'li_2_5', description: '60-Day Support Retainer', quantity: 1, unitPrice: 1000, total: 1000 },
    ],
    subtotal: 8750,
    total: 8750,
    notes: 'Sent after discovery call. Awaiting feedback from Marcus by April 1.',
    sentAt: '2026-03-10T14:00:00Z',
    validUntil: '2026-04-10T00:00:00Z',
    createdAt: '2026-03-08T10:00:00Z',
    updatedAt: '2026-03-10T14:00:00Z',
  },
  {
    id: 'prop_3',
    clientId: 'cl_3',
    title: 'SEO Retainer — Q2 2026',
    status: 'accepted',
    lineItems: [
      { id: 'li_3_1', description: 'Monthly SEO Audit & Reporting', quantity: 3, unitPrice: 600, total: 1800 },
      { id: 'li_3_2', description: 'Content Optimization (4 pages/mo)', quantity: 3, unitPrice: 200, total: 600 },
    ],
    subtotal: 2400,
    total: 2400,
    notes: 'Recurring quarterly retainer. Auto-renews unless cancelled 30 days prior.',
    sentAt: '2026-03-01T09:00:00Z',
    validUntil: '2026-03-15T00:00:00Z',
    createdAt: '2026-02-28T08:00:00Z',
    updatedAt: '2026-03-03T10:00:00Z',
  },
  {
    id: 'prop_4',
    clientId: 'cl_5',
    title: 'Client Portal with Document Storage',
    status: 'draft',
    lineItems: [
      { id: 'li_4_1', description: 'System Architecture & Planning', quantity: 1, unitPrice: 2000, total: 2000 },
      { id: 'li_4_2', description: 'Authentication & Role Management', quantity: 1, unitPrice: 3000, total: 3000 },
      { id: 'li_4_3', description: 'Document Upload & Storage System', quantity: 1, unitPrice: 4000, total: 4000 },
      { id: 'li_4_4', description: 'Client-Facing Portal UI', quantity: 1, unitPrice: 5000, total: 5000 },
      { id: 'li_4_5', description: 'Admin Dashboard & Reporting', quantity: 1, unitPrice: 2500, total: 2500 },
      { id: 'li_4_6', description: 'Security Audit & Compliance Review', quantity: 1, unitPrice: 1500, total: 1500 },
    ],
    subtotal: 18000,
    total: 18000,
    notes: 'Draft pending final scope confirmation. Tanya requested detailed security documentation.',
    createdAt: '2026-03-15T11:00:00Z',
    updatedAt: '2026-03-20T16:00:00Z',
  },
  {
    id: 'prop_5',
    clientId: 'cl_6',
    title: 'Brand Identity & Website Package',
    status: 'draft',
    lineItems: [
      { id: 'li_5_1', description: 'Brand Strategy Session', quantity: 1, unitPrice: 750, total: 750 },
      { id: 'li_5_2', description: 'Logo Design (3 concepts)', quantity: 1, unitPrice: 1500, total: 1500 },
      { id: 'li_5_3', description: 'Brand Style Guide', quantity: 1, unitPrice: 800, total: 800 },
      { id: 'li_5_4', description: '5-Page Website Build', quantity: 1, unitPrice: 1450, total: 1450 },
    ],
    subtotal: 4500,
    total: 4500,
    notes: 'To be sent after discovery call at end of March.',
    createdAt: '2026-03-05T15:00:00Z',
    updatedAt: '2026-03-05T15:00:00Z',
  },
  {
    id: 'prop_6',
    clientId: 'cl_4',
    title: 'Website Refresh — Owens Roofing',
    status: 'expired',
    lineItems: [
      { id: 'li_6_1', description: 'Design Refresh (existing structure)', quantity: 1, unitPrice: 1200, total: 1200 },
      { id: 'li_6_2', description: 'Mobile Optimization', quantity: 1, unitPrice: 600, total: 600 },
      { id: 'li_6_3', description: 'SEO Meta Updates', quantity: 1, unitPrice: 300, total: 300 },
    ],
    subtotal: 2100,
    total: 2100,
    notes: 'Sent mid-2025 but never accepted. Follow up in June 2026.',
    sentAt: '2025-07-01T10:00:00Z',
    validUntil: '2025-08-01T00:00:00Z',
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
