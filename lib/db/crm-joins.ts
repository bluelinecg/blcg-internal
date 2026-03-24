// Shared row types and mapping helpers for CRM join columns.
// These interfaces mirror the DB columns returned when a query joins the
// `organizations` or `contacts` tables. The mapping helpers translate them
// into the canonical TypeScript types from @/lib/types/crm.
//
// Import from here rather than duplicating these definitions across DB modules.

import type { Contact, Organization } from '@/lib/types/crm';

// ---------------------------------------------------------------------------
// Row types (mirror DB columns)
// ---------------------------------------------------------------------------

export interface OrganizationJoinRow {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  industry: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactJoinRow {
  id: string;
  organization_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

export function orgFromJoinRow(row: OrganizationJoinRow): Organization {
  return {
    id: row.id,
    name: row.name,
    website: row.website ?? undefined,
    phone: row.phone ?? undefined,
    industry: row.industry ?? undefined,
    address: row.address ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function contactFromJoinRow(row: ContactJoinRow): Contact {
  return {
    id: row.id,
    organizationId: row.organization_id ?? undefined,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    title: row.title ?? undefined,
    status: row.status as Contact['status'],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
