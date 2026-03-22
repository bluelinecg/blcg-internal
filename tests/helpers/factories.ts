/**
 * Test data factory functions.
 *
 * Each factory returns a fully-typed object with sensible defaults.
 * Override any field via the overrides argument:
 *   createMockClient({ status: 'inactive', name: 'Specific Corp' })
 *
 * Design conventions (extractable to any project):
 *   - IDs default to '<entity>-1' — use '<entity>-2', '-3' in multi-object tests
 *   - All dates use BASE_DATE (fixed ISO string, not Date.now()) for determinism
 *   - Optional fields are omitted by default — add via overrides when the test needs them
 *   - Each factory is a pure function with zero side effects
 *
 * Replace BLCG-specific type imports with your project's types when extracting.
 */

import type { Client } from '@/lib/types/clients';
import type { Proposal } from '@/lib/types/proposals';
import type { Project, Milestone } from '@/lib/types/projects';
import type { Invoice, Expense } from '@/lib/types/finances';

/** Fixed base date used for all timestamp fields. */
const BASE_DATE = '2026-01-01T00:00:00Z';

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export function createMockClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-1',
    name: 'Acme Corp',
    email: 'contact@acme.com',
    status: 'active',
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Proposal
// ---------------------------------------------------------------------------

export function createMockProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 'proposal-1',
    clientId: 'client-1',
    title: 'Website Redesign',
    status: 'draft',
    lineItems: [],
    subtotal: 0,
    total: 0,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Project + Milestone
// ---------------------------------------------------------------------------

export function createMockMilestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: 'milestone-1',
    name: 'Discovery',
    status: 'pending',
    order: 1,
    ...overrides,
  };
}

export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    clientId: 'client-1',
    name: 'Website Redesign Project',
    status: 'active',
    startDate: BASE_DATE,
    budget: 10_000,
    milestones: [],
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export function createMockInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'invoice-1',
    clientId: 'client-1',
    invoiceNumber: 'INV-001',
    status: 'draft',
    lineItems: [],
    subtotal: 0,
    total: 0,
    dueDate: '2026-02-01T00:00:00Z',
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Expense
// ---------------------------------------------------------------------------

export function createMockExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'expense-1',
    description: 'Software subscription',
    category: 'software',
    amount: 99,
    date: BASE_DATE,
    createdAt: BASE_DATE,
    ...overrides,
  };
}
