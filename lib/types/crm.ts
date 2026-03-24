// Core CRM entity types — Contacts (individuals) and Organizations (companies).
// Contacts belong to zero or one Organization.
// Both entities are the anchor for workflows, tasks, pipelines, and communications.

export type ContactStatus = 'lead' | 'prospect' | 'active' | 'inactive';

export interface Contact {
  id: string;
  organizationId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  status: ContactStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  website?: string;
  phone?: string;
  industry?: string;
  address?: string;
  notes?: string;
  contactCount?: number;
  createdAt: string;
  updatedAt: string;
}
