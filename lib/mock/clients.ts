import type { Client } from '@/lib/types/clients';

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'cl_1',
    name: 'Sarah Johnson',
    email: 'sarah@acmecorp.com',
    phone: '(555) 123-4567',
    company: 'Acme Corp',
    status: 'active',
    notes: 'Primary contact for the e-commerce redesign project. Prefers communication via email. Decision-maker on budget.',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-03-10T14:30:00Z',
  },
  {
    id: 'cl_2',
    name: 'Marcus Lee',
    email: 'marcus@brightpath.com',
    phone: '(555) 987-6543',
    company: 'Brightpath LLC',
    status: 'prospect',
    notes: 'Met at the Denver business summit. Interested in a CRM solution for their sales team. Follow up after April 1.',
    createdAt: '2026-02-03T09:15:00Z',
    updatedAt: '2026-02-20T11:00:00Z',
  },
  {
    id: 'cl_3',
    name: 'Linda Park',
    email: 'linda@novabloom.co',
    phone: '(555) 456-7890',
    company: 'Nova Bloom Co.',
    status: 'active',
    notes: 'Ongoing retainer for monthly maintenance and SEO reporting. Contract renews every 6 months.',
    createdAt: '2025-11-20T08:00:00Z',
    updatedAt: '2026-03-15T16:45:00Z',
  },
  {
    id: 'cl_4',
    name: 'Derek Owens',
    email: 'derek@owensroofing.com',
    phone: '(555) 321-0987',
    company: 'Owens Roofing',
    status: 'inactive',
    notes: 'Project completed Q4 2025. May want a website refresh mid-2026. Check back in June.',
    createdAt: '2025-08-10T13:30:00Z',
    updatedAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 'cl_5',
    name: 'Tanya Rivera',
    email: 'tanya@riveralaw.com',
    phone: '(555) 654-3210',
    company: 'Rivera Law Group',
    status: 'active',
    notes: 'Building out a client portal with secure document storage. Very detail-oriented — document every decision in writing.',
    createdAt: '2026-01-28T11:00:00Z',
    updatedAt: '2026-03-18T09:20:00Z',
  },
  {
    id: 'cl_6',
    name: 'James Whitfield',
    email: 'james@whitfieldmedia.com',
    company: 'Whitfield Media',
    status: 'prospect',
    notes: 'Referred by Sarah Johnson. Initial discovery call scheduled for end of March.',
    createdAt: '2026-03-05T14:00:00Z',
    updatedAt: '2026-03-05T14:00:00Z',
  },
];

export function getAllClients(): Client[] {
  return MOCK_CLIENTS;
}

export function getClientById(id: string): Client | undefined {
  return MOCK_CLIENTS.find((c) => c.id === id);
}
