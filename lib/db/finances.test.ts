// Unit tests for lib/db/finances.ts
// Supabase serverClient is mocked — no real DB connection needed.

import {
  listInvoices,
  getInvoiceById,
  createInvoice,
  deleteInvoice,
  getNextInvoiceNumber,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from './finances';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

function makeChain(result: { data: unknown; count?: number | null; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then: jest.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result))),
  };
  return chain;
}

jest.mock('@/lib/db/supabase', () => ({ serverClient: jest.fn() }));
import { serverClient } from '@/lib/db/supabase';
const mockServerClient = serverClient as jest.Mock;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const LINE_ITEM_ROW = {
  id: 'li-1',
  invoice_id: 'inv-1',
  description: 'Web Design',
  sub_description: null,
  quantity: 1,
  unit_price: 5000,
  total: 5000,
  is_included: false,
  sort_order: 0,
};

const INVOICE_ROW = {
  id: 'inv-1',
  client_id: 'client-1',
  project_id: 'proj-1',
  proposal_id: null,
  invoice_number: 'BL-2026-001',
  status: 'draft',
  subtotal: 5000,
  tax: 0,
  total: 5000,
  deposit_amount: null,
  balance_due: null,
  payment_terms: 'Net 15',
  payment_method: null,
  due_date: '2026-04-15',
  paid_date: null,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  invoice_line_items: [LINE_ITEM_ROW],
};

const EXPENSE_ROW = {
  id: 'exp-1',
  description: 'GitHub Copilot',
  category: 'software',
  amount: 19,
  project_id: null,
  vendor: 'GitHub',
  date: '2026-03-01',
  notes: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// listInvoices
// ---------------------------------------------------------------------------

describe('listInvoices', () => {
  it('returns mapped invoices with line items on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [INVOICE_ROW], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listInvoices();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe('inv-1');
    expect(data![0].invoiceNumber).toBe('BL-2026-001');
    expect(data![0].lineItems).toHaveLength(1);
    expect(data![0].lineItems[0].description).toBe('Web Design');
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'DB error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listInvoices();

    expect(data).toBeNull();
    expect(error).toBe('DB error');
  });
});

// ---------------------------------------------------------------------------
// getInvoiceById
// ---------------------------------------------------------------------------

describe('getInvoiceById', () => {
  it('returns the invoice when found', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: INVOICE_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getInvoiceById('inv-1');

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.clientId).toBe('client-1');
    expect(data!.tax).toBe(0);
    expect(data!.paymentTerms).toBe('Net 15');
  });

  it('returns null data (not error) when not found (PGRST116)', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getInvoiceById('nonexistent');

    expect(data).toBeNull();
    expect(error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createInvoice
// ---------------------------------------------------------------------------

describe('createInvoice', () => {
  it('creates an invoice with line items', async () => {
    const db = { from: jest.fn() };
    const invoiceChain = makeChain({ data: { ...INVOICE_ROW, invoice_line_items: undefined }, error: null });
    const lineItemChain = makeChain({ data: [LINE_ITEM_ROW], error: null });
    db.from
      .mockReturnValueOnce(invoiceChain)
      .mockReturnValueOnce(lineItemChain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createInvoice({
      clientId: 'client-1',
      projectId: 'proj-1',
      invoiceNumber: 'BL-2026-001',
      status: 'draft',
      lineItems: [{ description: 'Web Design', total: 5000, isIncluded: false }],
      subtotal: 5000,
      total: 5000,
      dueDate: '2026-04-15T00:00:00Z',
    });

    expect(error).toBeNull();
    expect(data!.lineItems).toHaveLength(1);
  });

  it('creates an invoice with no line items', async () => {
    const db = { from: jest.fn() };
    const invoiceChain = makeChain({ data: { ...INVOICE_ROW, invoice_line_items: undefined }, error: null });
    db.from.mockReturnValueOnce(invoiceChain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createInvoice({
      clientId: 'client-1',
      invoiceNumber: 'BL-2026-001',
      status: 'draft',
      lineItems: [],
      subtotal: 0,
      total: 0,
      dueDate: '2026-04-15T00:00:00Z',
    });

    expect(error).toBeNull();
    expect(data!.lineItems).toHaveLength(0);
  });

  it('returns error if invoice insert fails', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Insert failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createInvoice({
      clientId: 'client-1',
      invoiceNumber: 'BL-2026-001',
      status: 'draft',
      lineItems: [],
      subtotal: 0,
      total: 0,
      dueDate: '2026-04-15T00:00:00Z',
    });

    expect(data).toBeNull();
    expect(error).toBe('Insert failed');
  });
});

// ---------------------------------------------------------------------------
// deleteInvoice
// ---------------------------------------------------------------------------

describe('deleteInvoice', () => {
  it('returns null error on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteInvoice('inv-1');
    expect(error).toBeNull();
  });

  it('returns error string on failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Delete failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteInvoice('inv-1');
    expect(error).toBe('Delete failed');
  });
});

// ---------------------------------------------------------------------------
// getNextInvoiceNumber
// ---------------------------------------------------------------------------

describe('getNextInvoiceNumber', () => {
  it('returns next sequential number when invoices exist', async () => {
    const year = new Date().getFullYear();
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [{ invoice_number: `BL-${year}-003` }], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getNextInvoiceNumber();

    expect(error).toBeNull();
    expect(data).toBe(`BL-${year}-004`);
  });

  it('returns 001 when no invoices exist for the year', async () => {
    const year = new Date().getFullYear();
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getNextInvoiceNumber();

    expect(error).toBeNull();
    expect(data).toBe(`BL-${year}-001`);
  });
});

// ---------------------------------------------------------------------------
// listExpenses
// ---------------------------------------------------------------------------

describe('listExpenses', () => {
  it('returns mapped expenses on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [EXPENSE_ROW], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listExpenses();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].description).toBe('GitHub Copilot');
    expect(data![0].vendor).toBe('GitHub');
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'DB error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listExpenses();

    expect(data).toBeNull();
    expect(error).toBe('DB error');
  });
});

// ---------------------------------------------------------------------------
// createExpense
// ---------------------------------------------------------------------------

describe('createExpense', () => {
  it('creates an expense and returns the mapped record', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: EXPENSE_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createExpense({
      description: 'GitHub Copilot',
      category: 'software',
      amount: 19,
      vendor: 'GitHub',
      date: '2026-03-01T00:00:00Z',
    });

    expect(error).toBeNull();
    expect(data!.category).toBe('software');
    expect(data!.amount).toBe(19);
  });
});

// ---------------------------------------------------------------------------
// updateExpense
// ---------------------------------------------------------------------------

describe('updateExpense', () => {
  it('returns updated expense on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: { ...EXPENSE_ROW, amount: 25 }, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await updateExpense('exp-1', { amount: 25 });

    expect(error).toBeNull();
    expect(data!.amount).toBe(25);
  });

  it('returns null data (not error) when not found (PGRST116)', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await updateExpense('nonexistent', { amount: 25 });

    expect(data).toBeNull();
    expect(error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteExpense
// ---------------------------------------------------------------------------

describe('deleteExpense', () => {
  it('returns null error on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteExpense('exp-1');
    expect(error).toBeNull();
  });

  it('returns error string on failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Delete failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteExpense('exp-1');
    expect(error).toBe('Delete failed');
  });
});
