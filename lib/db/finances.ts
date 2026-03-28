// Database query functions for the finances module (invoices and expenses).
// All functions use serverClient() (service role, bypasses RLS).
// Call only from server-side code — API routes, Server Actions, async Server Components.
//
// Invoices are blocked from deletion if status is sent/viewed/overdue.
// Expenses have no dependency restrictions — always deletable.

import { serverClient } from '@/lib/db/supabase';
import type {
  Invoice,
  InvoiceLineItem,
  Expense,
  InvoiceStatus,
  ExpenseCategory,
  PaymentMethod,
  FinanceSummary,
} from '@/lib/types/finances';
import type {
  InvoiceInput,
  UpdateInvoiceInput,
  ExpenseInput,
  UpdateExpenseInput,
} from '@/lib/validations/finances';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import type { ListOptions, PaginatedResult } from '@/lib/types/pagination';
import { type OrganizationJoinRow, orgFromJoinRow } from '@/lib/db/crm-joins';

// ---------------------------------------------------------------------------
// Row types (mirror DB columns)
// ---------------------------------------------------------------------------

interface InvoiceRow {
  id: string;
  client_id: string | null;
  organization_id: string | null;
  organizations?: OrganizationJoinRow | null;
  project_id: string | null;
  proposal_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number | null;
  total: number;
  deposit_amount: number | null;
  balance_due: number | null;
  payment_terms: string | null;
  payment_method: PaymentMethod | null;
  due_date: string;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  invoice_line_items?: InvoiceLineItemRow[];
}

interface InvoiceLineItemRow {
  id: string;
  invoice_id: string;
  description: string;
  sub_description: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number;
  is_included: boolean;
  sort_order: number;
}

interface ExpenseRow {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  project_id: string | null;
  vendor: string | null;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function lineItemFromRow(row: InvoiceLineItemRow): InvoiceLineItem {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description,
    subDescription: row.sub_description ?? undefined,
    quantity: row.quantity ?? undefined,
    unitPrice: row.unit_price ?? undefined,
    total: row.total,
    isIncluded: row.is_included,
    sortOrder: row.sort_order,
  };
}

function invoiceFromRow(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    clientId: row.client_id ?? undefined,
    organizationId: row.organization_id ?? '',
    organization: row.organizations ? orgFromJoinRow(row.organizations) : undefined,
    projectId: row.project_id ?? undefined,
    proposalId: row.proposal_id ?? undefined,
    invoiceNumber: row.invoice_number,
    status: row.status,
    lineItems: (row.invoice_line_items ?? []).map(lineItemFromRow),
    subtotal: row.subtotal,
    tax: row.tax ?? 0,
    total: row.total,
    depositAmount: row.deposit_amount ?? undefined,
    balanceDue: row.balance_due ?? undefined,
    paymentTerms: row.payment_terms ?? 'Net 15',
    paymentMethod: row.payment_method ?? undefined,
    dueDate: row.due_date,
    paidDate: row.paid_date ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function invoiceToInsert(
  data: InvoiceInput,
): Omit<InvoiceRow, 'id' | 'created_at' | 'updated_at' | 'invoice_line_items' | 'organizations'> {
  return {
    client_id: data.clientId ?? null,
    organization_id: data.organizationId,
    project_id: data.projectId ?? null,
    proposal_id: data.proposalId ?? null,
    invoice_number: data.invoiceNumber,
    status: data.status,
    subtotal: data.subtotal,
    tax: data.tax ?? null,
    total: data.total,
    deposit_amount: data.depositAmount ?? null,
    balance_due: data.balanceDue ?? null,
    payment_terms: data.paymentTerms ?? null,
    payment_method: data.paymentMethod ?? null,
    due_date: data.dueDate.split('T')[0],
    paid_date: data.paidDate ? data.paidDate.split('T')[0] : null,
    notes: data.notes ?? null,
  };
}

function expenseFromRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    description: row.description,
    category: row.category,
    amount: row.amount,
    projectId: row.project_id ?? undefined,
    vendor: row.vendor ?? undefined,
    date: row.date,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function expenseToInsert(data: ExpenseInput): Omit<ExpenseRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    description: data.description,
    category: data.category,
    amount: data.amount,
    project_id: data.projectId ?? null,
    vendor: data.vendor ?? null,
    date: data.date.split('T')[0],
    notes: data.notes ?? null,
  };
}

// ---------------------------------------------------------------------------
// Invoice query functions
// ---------------------------------------------------------------------------

/** Returns a paginated, sorted list of invoices with their line items. */
export async function listInvoices(options?: ListOptions): Promise<PaginatedResult<Invoice>> {
  try {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, sort = 'created_at', order = 'desc' } = options ?? {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await serverClient()
      .from('invoices')
      .select('*, invoice_line_items(*), organizations(*)', { count: 'exact' })
      .order(sort, { ascending: order !== 'desc' })
      .range(from, to);

    if (error) return { data: null, total: null, error: error.message };
    return { data: (data as InvoiceRow[]).map(invoiceFromRow), total: count, error: null };
  } catch (err) {
    console.error('[listInvoices]', err);
    return { data: null, total: null, error: 'Failed to load invoices' };
  }
}

/** Returns a single invoice with line items, or null if not found. */
export async function getInvoiceById(
  id: string,
): Promise<{ data: Invoice | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('invoices')
      .select('*, invoice_line_items(*), organizations(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: invoiceFromRow(data as InvoiceRow), error: null };
  } catch (err) {
    console.error('[getInvoiceById]', err);
    return { data: null, error: 'Failed to load invoice' };
  }
}

/**
 * Creates an invoice and its line items.
 * Line items are inserted after the invoice to capture the generated invoice ID.
 */
export async function createInvoice(
  input: InvoiceInput,
): Promise<{ data: Invoice | null; error: string | null }> {
  try {
    const db = serverClient();

    const { data: invoiceRow, error: invoiceErr } = await db
      .from('invoices')
      .insert(invoiceToInsert(input))
      .select('*')
      .single();

    if (invoiceErr) return { data: null, error: invoiceErr.message };
    const invoice = invoiceRow as InvoiceRow;

    if (input.lineItems.length > 0) {
      const lineItemRows = input.lineItems.map((li, i) => ({
        invoice_id: invoice.id,
        description: li.description,
        sub_description: li.subDescription ?? null,
        quantity: li.quantity ?? null,
        unit_price: li.unitPrice ?? null,
        total: li.total,
        is_included: li.isIncluded ?? false,
        sort_order: li.sortOrder ?? i,
      }));

      const { data: items, error: lineItemsErr } = await db
        .from('invoice_line_items')
        .insert(lineItemRows)
        .select('*');

      if (lineItemsErr) return { data: null, error: lineItemsErr.message };
      invoice.invoice_line_items = items as InvoiceLineItemRow[];
    } else {
      invoice.invoice_line_items = [];
    }

    return { data: invoiceFromRow(invoice), error: null };
  } catch (err) {
    console.error('[createInvoice]', err);
    return { data: null, error: 'Failed to create invoice' };
  }
}

/**
 * Updates an invoice and replaces all its line items if provided.
 */
export async function updateInvoice(
  id: string,
  input: UpdateInvoiceInput,
): Promise<{ data: Invoice | null; error: string | null }> {
  try {
    const db = serverClient();

    const patch: Partial<Omit<InvoiceRow, 'id' | 'created_at' | 'updated_at' | 'invoice_line_items' | 'organizations'>> = {};
    if (input.clientId !== undefined) patch.client_id = input.clientId ?? null;
    if (input.organizationId !== undefined) patch.organization_id = input.organizationId;
    if (input.projectId !== undefined) patch.project_id = input.projectId ?? null;
    if (input.proposalId !== undefined) patch.proposal_id = input.proposalId ?? null;
    if (input.invoiceNumber !== undefined) patch.invoice_number = input.invoiceNumber;
    if (input.status !== undefined) patch.status = input.status;
    if (input.subtotal !== undefined) patch.subtotal = input.subtotal;
    if (input.tax !== undefined) patch.tax = input.tax ?? null;
    if (input.total !== undefined) patch.total = input.total;
    if (input.depositAmount !== undefined) patch.deposit_amount = input.depositAmount ?? null;
    if (input.balanceDue !== undefined) patch.balance_due = input.balanceDue ?? null;
    if (input.paymentTerms !== undefined) patch.payment_terms = input.paymentTerms ?? null;
    if (input.paymentMethod !== undefined) patch.payment_method = input.paymentMethod ?? null;
    if (input.dueDate !== undefined) patch.due_date = input.dueDate.split('T')[0];
    if (input.paidDate !== undefined) patch.paid_date = input.paidDate ? input.paidDate.split('T')[0] : null;
    if (input.notes !== undefined) patch.notes = input.notes ?? null;

    const { data: invoiceRow, error: invoiceErr } = await db
      .from('invoices')
      .update(patch)
      .eq('id', id)
      .select('*, organizations(*)')
      .single();

    if (invoiceErr) return { data: null, error: invoiceErr.message };
    const invoice = invoiceRow as InvoiceRow;

    if (input.lineItems !== undefined) {
      const { error: deleteErr } = await db
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', id);

      if (deleteErr) return { data: null, error: deleteErr.message };

      if (input.lineItems.length > 0) {
        const lineItemRows = input.lineItems.map((li, i) => ({
          invoice_id: id,
          description: li.description,
          sub_description: li.subDescription ?? null,
          quantity: li.quantity ?? null,
          unit_price: li.unitPrice ?? null,
          total: li.total,
          is_included: li.isIncluded ?? false,
          sort_order: li.sortOrder ?? i,
        }));

        const { data: items, error: lineItemsErr } = await db
          .from('invoice_line_items')
          .insert(lineItemRows)
          .select('*');

        if (lineItemsErr) return { data: null, error: lineItemsErr.message };
        invoice.invoice_line_items = items as InvoiceLineItemRow[];
      } else {
        invoice.invoice_line_items = [];
      }
    } else {
      const { data: items, error: lineItemsErr } = await db
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', id)
        .order('sort_order');

      if (lineItemsErr) return { data: null, error: lineItemsErr.message };
      invoice.invoice_line_items = (items as InvoiceLineItemRow[]) ?? [];
    }

    return { data: invoiceFromRow(invoice), error: null };
  } catch (err) {
    console.error('[updateInvoice]', err);
    return { data: null, error: 'Failed to update invoice' };
  }
}

/** Deletes an invoice (line items cascade via FK). Caller is responsible for dependency checks. */
export async function deleteInvoice(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient()
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deleteInvoice]', err);
    return { error: 'Failed to delete invoice' };
  }
}

/** Returns the next invoice number in BL-YYYY-NNN format. */
export async function getNextInvoiceNumber(): Promise<{ data: string | null; error: string | null }> {
  try {
    const year = new Date().getFullYear();
    const prefix = `BL-${year}-`;

    const { data, error } = await serverClient()
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${prefix}%`)
      .order('invoice_number', { ascending: false })
      .limit(1);

    if (error) return { data: null, error: error.message };

    const rows = data as { invoice_number: string }[];
    const last = rows[0]?.invoice_number ?? null;
    const seq = last ? parseInt(last.split('-')[2] ?? '0', 10) : 0;
    return { data: `${prefix}${String(seq + 1).padStart(3, '0')}`, error: null };
  } catch (err) {
    console.error('[getNextInvoiceNumber]', err);
    return { data: null, error: 'Failed to generate invoice number' };
  }
}

// ---------------------------------------------------------------------------
// Expense query functions
// ---------------------------------------------------------------------------

/** Returns a paginated, sorted list of expenses. */
export async function listExpenses(options?: ListOptions): Promise<PaginatedResult<Expense>> {
  try {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, sort = 'date', order = 'desc' } = options ?? {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await serverClient()
      .from('expenses')
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order !== 'desc' })
      .range(from, to);

    if (error) return { data: null, total: null, error: error.message };
    return { data: (data as ExpenseRow[]).map(expenseFromRow), total: count, error: null };
  } catch (err) {
    console.error('[listExpenses]', err);
    return { data: null, total: null, error: 'Failed to load expenses' };
  }
}

/** Returns a single expense, or null if not found. */
export async function getExpenseById(
  id: string,
): Promise<{ data: Expense | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: expenseFromRow(data as ExpenseRow), error: null };
  } catch (err) {
    console.error('[getExpenseById]', err);
    return { data: null, error: 'Failed to load expense' };
  }
}

/** Creates an expense and returns it. */
export async function createExpense(
  input: ExpenseInput,
): Promise<{ data: Expense | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('expenses')
      .insert(expenseToInsert(input))
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: expenseFromRow(data as ExpenseRow), error: null };
  } catch (err) {
    console.error('[createExpense]', err);
    return { data: null, error: 'Failed to create expense' };
  }
}

/** Updates an expense and returns the updated record. */
export async function updateExpense(
  id: string,
  input: UpdateExpenseInput,
): Promise<{ data: Expense | null; error: string | null }> {
  try {
    const patch: Partial<Omit<ExpenseRow, 'id' | 'created_at' | 'updated_at'>> = {};
    if (input.description !== undefined) patch.description = input.description;
    if (input.category !== undefined) patch.category = input.category;
    if (input.amount !== undefined) patch.amount = input.amount;
    if (input.projectId !== undefined) patch.project_id = input.projectId ?? null;
    if (input.vendor !== undefined) patch.vendor = input.vendor ?? null;
    if (input.date !== undefined) patch.date = input.date.split('T')[0];
    if (input.notes !== undefined) patch.notes = input.notes ?? null;

    const { data, error } = await serverClient()
      .from('expenses')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: expenseFromRow(data as ExpenseRow), error: null };
  } catch (err) {
    console.error('[updateExpense]', err);
    return { data: null, error: 'Failed to update expense' };
  }
}

/** Deletes an expense. Expenses have no dependency restrictions. */
export async function deleteExpense(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient()
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deleteExpense]', err);
    return { error: 'Failed to delete expense' };
  }
}

// ---------------------------------------------------------------------------
// Finance summary
// ---------------------------------------------------------------------------

interface InvoiceAggRow { status: InvoiceStatus; total: number }
interface ExpenseAggRow { category: ExpenseCategory; amount: number }
interface RecentInvoiceRow {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total: number;
  organizations: OrganizationJoinRow[] | null;
}

/**
 * Returns aggregate financial KPIs across ALL invoices and expenses.
 * Three lightweight queries run in parallel — no pagination applied.
 */
export async function getFinanceSummary(): Promise<{ data: FinanceSummary | null; error: string | null }> {
  try {
    const db = serverClient();

    const [invoiceAggResult, expenseAggResult, recentResult] = await Promise.all([
      db.from('invoices').select('status, total'),
      db.from('expenses').select('category, amount'),
      db.from('invoices')
        .select('id, invoice_number, status, total, organizations(id, name, website, phone, industry, address, notes, created_at, updated_at)')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (invoiceAggResult.error) return { data: null, error: invoiceAggResult.error.message };
    if (expenseAggResult.error) return { data: null, error: expenseAggResult.error.message };
    if (recentResult.error)     return { data: null, error: recentResult.error.message };

    const invoiceRows = (invoiceAggResult.data ?? []) as InvoiceAggRow[];
    const expenseRows = (expenseAggResult.data ?? []) as ExpenseAggRow[];
    const recentRows  = (recentResult.data ?? []) as RecentInvoiceRow[];

    let totalRevenue     = 0;
    let totalOutstanding = 0;
    let overdueCount     = 0;
    let overdueAmount    = 0;

    for (const row of invoiceRows) {
      if (row.status === 'paid') {
        totalRevenue += row.total;
      } else if (row.status === 'sent' || row.status === 'viewed' || row.status === 'overdue') {
        totalOutstanding += row.total;
        if (row.status === 'overdue') {
          overdueCount += 1;
          overdueAmount += row.total;
        }
      }
    }

    let totalExpenses = 0;
    const categoryMap = new Map<ExpenseCategory, number>();
    for (const row of expenseRows) {
      totalExpenses += row.amount;
      categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + row.amount);
    }

    const expensesByCategory = Array.from(categoryMap.entries()).map(([category, total]) => ({ category, total }));

    const recentInvoices = recentRows.map((row) => ({
      id:            row.id,
      invoiceNumber: row.invoice_number,
      status:        row.status,
      total:         row.total,
      organization:  row.organizations?.[0] ? orgFromJoinRow(row.organizations[0]) : undefined,
    }));

    return {
      data: {
        totalRevenue,
        totalOutstanding,
        overdueCount,
        overdueAmount,
        totalExpenses,
        netPL: totalRevenue - totalExpenses,
        expensesByCategory,
        recentInvoices,
      },
      error: null,
    };
  } catch (err) {
    console.error('[getFinanceSummary]', err);
    return { data: null, error: 'Failed to load finance summary' };
  }
}
