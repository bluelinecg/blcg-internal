'use client';

// Finances page — live data via /api/invoices and /api/expenses (paginated, sortable).
// Clients and projects are fetched in full for form dropdowns and display.
// Text/category filters run client-side against the current page.

import { useState, useEffect, useMemo } from 'react';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Tabs, StatCard, Card, Badge, Select, Input, Button, ConfirmDialog, Spinner, Pagination, SortableHeader } from '@/components/ui';
import type { TabItem } from '@/components/ui/Tabs';
import { useListState } from '@/lib/hooks/use-list-state';
import { InvoiceFormModal, ExpenseFormModal } from '@/components/modules';
import type { Invoice, Expense, InvoiceStatus, ExpenseCategory } from '@/lib/types/finances';
import type { Organization } from '@/lib/types/crm';
import type { Project } from '@/lib/types/projects';
import type { CatalogItem } from '@/lib/types/catalog';

const TABS: TabItem[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'invoices',  label: 'Invoices' },
  { id: 'expenses',  label: 'Expenses' },
];

const INVOICE_STATUS_BADGE: Record<InvoiceStatus, { variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray'; label: string }> = {
  draft:     { variant: 'gray',   label: 'Draft' },
  sent:      { variant: 'blue',   label: 'Sent' },
  viewed:    { variant: 'yellow', label: 'Viewed' },
  paid:      { variant: 'green',  label: 'Paid' },
  overdue:   { variant: 'red',    label: 'Overdue' },
  cancelled: { variant: 'gray',   label: 'Cancelled' },
};

const INVOICE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

const EXPENSE_CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'software', label: 'Software' },
  { value: 'contractors', label: 'Contractors' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'travel', label: 'Travel' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  software: 'Software', contractors: 'Contractors', marketing: 'Marketing',
  equipment: 'Equipment', travel: 'Travel', office: 'Office', other: 'Other',
};

type InvoiceFormData = Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>;
type ExpenseFormData = Omit<Expense, 'id' | 'createdAt'>;

export function FinancesPage() {
  // Paginated lists
  const invoices = useListState<Invoice>({ endpoint: '/api/invoices', defaultSort: 'created_at', defaultOrder: 'desc' });
  const expenses = useListState<Expense>({ endpoint: '/api/expenses', defaultSort: 'date', defaultOrder: 'desc' });

  // Full organizations + projects for form dropdowns (unpaginated)
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects]           = useState<Project[]>([]);
  useEffect(() => {
    Promise.all([
      fetch('/api/organizations?pageSize=200&sort=name').then((r) => r.json()),
      fetch('/api/projects?pageSize=100&sort=name').then((r) => r.json()),
    ]).then(([oj, pj]: [{ data: Organization[] | null }, { data: Project[] | null }]) => {
      setOrganizations(oj.data ?? []);
      setProjects(pj.data ?? []);
    }).catch(() => { /* non-critical */ });
  }, []);

  // Active catalog items for the line item picker
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  useEffect(() => {
    fetch('/api/catalog?activeOnly=true&pageSize=200&sort=name')
      .then((r) => r.json())
      .then((j: { data: CatalogItem[] | null }) => setCatalogItems(j.data ?? []))
      .catch(() => setCatalogItems([]));
  }, []);

  const [activeTab, setActiveTab]                           = useState('overview');
  const [invoiceStatusFilter, setInvoiceStatusFilter]       = useState('all');
  const [invoiceSearch, setInvoiceSearch]                   = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter]   = useState('all');

  // Invoice CRUD
  const [invoiceFormOpen, setInvoiceFormOpen]               = useState(false);
  const [invoiceDeleteTarget, setInvoiceDeleteTarget]       = useState<Invoice | null>(null);
  const [invoiceDeleteBlockers, setInvoiceDeleteBlockers]   = useState<string[]>([]);
  const [isCheckingInvDeps, setIsCheckingInvDeps]           = useState(false);
  const [isInvoiceSaving, setIsInvoiceSaving]               = useState(false);
  const [invoiceSaveError, setInvoiceSaveError]             = useState<string | null>(null);
  const [isInvoiceDeleting, setIsInvoiceDeleting]           = useState(false);
  const [invoiceDeleteError, setInvoiceDeleteError]         = useState<string | null>(null);

  // Expense CRUD
  const [expenseFormOpen, setExpenseFormOpen]               = useState(false);
  const [editingExpense, setEditingExpense]                 = useState<Expense | null>(null);
  const [expenseDeleteTarget, setExpenseDeleteTarget]       = useState<Expense | null>(null);
  const [isExpenseSaving, setIsExpenseSaving]               = useState(false);
  const [expenseSaveError, setExpenseSaveError]             = useState<string | null>(null);
  const [isExpenseDeleting, setIsExpenseDeleting]           = useState(false);
  const [expenseDeleteError, setExpenseDeleteError]         = useState<string | null>(null);

  const isLoading = invoices.isLoading || expenses.isLoading;
  const fetchError = invoices.error ?? expenses.error;

  const filteredInvoices = useMemo(() => {
    return invoices.data.filter((inv) => {
      const q = invoiceSearch.toLowerCase();
      const matchesSearch = q === '' || inv.invoiceNumber.toLowerCase().includes(q) || (inv.organization?.name.toLowerCase().includes(q) ?? false);
      const matchesStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices.data, invoiceSearch, invoiceStatusFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.data.filter((exp) => expenseCategoryFilter === 'all' || exp.category === expenseCategoryFilter);
  }, [expenses.data, expenseCategoryFilter]);

  // --- Invoice handlers ---

  function nextInvoiceNum(): string {
    const year = new Date().getFullYear();
    const prefix = `BL-${year}-`;
    const max = invoices.data
      .filter((i) => i.invoiceNumber.startsWith(prefix))
      .map((i) => parseInt(i.invoiceNumber.split('-')[2] ?? '0', 10))
      .reduce((a, b) => Math.max(a, b), 0);
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  }

  async function handleCreateInvoice(data: InvoiceFormData) {
    setIsInvoiceSaving(true);
    setInvoiceSaveError(null);
    try {
      const res  = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: Invoice | null; error: string | null };
      if (!res.ok || json.error) { setInvoiceSaveError(json.error ?? 'Failed to create invoice'); return; }
      setInvoiceFormOpen(false);
      invoices.reload();
    } catch {
      setInvoiceSaveError('Network error. Please try again.');
    } finally {
      setIsInvoiceSaving(false);
    }
  }

  async function openInvoiceDelete(inv: Invoice) {
    setIsCheckingInvDeps(true);
    setInvoiceDeleteError(null);
    try {
      const res  = await fetch(`/api/invoices/${inv.id}/blockers`);
      const json = await res.json() as { data: string[] | null; error: string | null };
      if (!res.ok || json.error) { setInvoiceDeleteError(json.error ?? 'Could not check dependencies'); return; }
      setInvoiceDeleteBlockers(json.data ?? []);
      setInvoiceDeleteTarget(inv);
    } catch {
      setInvoiceDeleteError('Network error. Please try again.');
    } finally {
      setIsCheckingInvDeps(false);
    }
  }

  async function confirmInvoiceDelete() {
    if (!invoiceDeleteTarget) return;
    setIsInvoiceDeleting(true);
    setInvoiceDeleteError(null);
    try {
      const res  = await fetch(`/api/invoices/${invoiceDeleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) { setInvoiceDeleteError(json.error ?? 'Failed to delete invoice'); setInvoiceDeleteTarget(null); return; }
      setInvoiceDeleteTarget(null);
      invoices.reload();
    } catch {
      setInvoiceDeleteError('Network error. Please try again.');
    } finally {
      setIsInvoiceDeleting(false);
    }
  }

  // --- Expense handlers ---

  async function handleSaveExpense(data: ExpenseFormData) {
    setIsExpenseSaving(true);
    setExpenseSaveError(null);
    try {
      if (editingExpense) {
        const res  = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json() as { data: Expense | null; error: string | null };
        if (!res.ok || json.error) { setExpenseSaveError(json.error ?? 'Failed to update expense'); return; }
      } else {
        const res  = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json() as { data: Expense | null; error: string | null };
        if (!res.ok || json.error) { setExpenseSaveError(json.error ?? 'Failed to create expense'); return; }
      }
      closeExpenseForm();
      expenses.reload();
    } catch {
      setExpenseSaveError('Network error. Please try again.');
    } finally {
      setIsExpenseSaving(false);
    }
  }

  function openEditExpense(exp: Expense) {
    setEditingExpense(exp);
    setExpenseSaveError(null);
    setExpenseFormOpen(true);
  }

  async function confirmExpenseDelete() {
    if (!expenseDeleteTarget) return;
    setIsExpenseDeleting(true);
    setExpenseDeleteError(null);
    try {
      const res  = await fetch(`/api/expenses/${expenseDeleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) { setExpenseDeleteError(json.error ?? 'Failed to delete expense'); setExpenseDeleteTarget(null); return; }
      setExpenseDeleteTarget(null);
      expenses.reload();
    } catch {
      setExpenseDeleteError('Network error. Please try again.');
    } finally {
      setIsExpenseDeleting(false);
    }
  }

  function closeExpenseForm() {
    setExpenseFormOpen(false);
    setEditingExpense(null);
    setExpenseSaveError(null);
  }

  // Derived totals (current page)
  const totalRevenue     = invoices.data.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalOutstanding = invoices.data.filter((i) => ['sent', 'viewed', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0);
  const totalExpensesAmt = expenses.data.reduce((s, e) => s + e.amount, 0);
  const netPL            = totalRevenue - totalExpensesAmt;
  const overdueCount     = invoices.data.filter((i) => i.status === 'overdue').length;

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Finances" subtitle="Revenue, invoices, and expense tracking" />
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      </PageShell>
    );
  }

  if (fetchError) {
    return (
      <PageShell>
        <PageHeader title="Finances" subtitle="Revenue, invoices, and expense tracking" />
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-red-500">{fetchError}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Finances"
        subtitle="Revenue, invoices, and expense tracking"
        actions={
          activeTab === 'invoices' ? (
            <Button onClick={() => { setInvoiceSaveError(null); setInvoiceFormOpen(true); }}>+ New Invoice</Button>
          ) : activeTab === 'expenses' ? (
            <Button onClick={() => { setEditingExpense(null); setExpenseSaveError(null); setExpenseFormOpen(true); }}>+ New Expense</Button>
          ) : undefined
        }
      />

      {(invoiceDeleteError || expenseDeleteError) && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{invoiceDeleteError ?? expenseDeleteError}</p>
        </div>
      )}

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Revenue (Paid)" value={formatCurrency(totalRevenue)} sub="From paid invoices" accent="green" />
            <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)} sub={overdueCount > 0 ? `${overdueCount} overdue` : 'None overdue'} accent={overdueCount > 0 ? 'red' : 'yellow'} />
            <StatCard label="Total Expenses" value={formatCurrency(totalExpensesAmt)} accent="yellow" />
            <StatCard label="Net P&L" value={formatCurrency(netPL)} sub="Revenue minus expenses" accent={netPL >= 0 ? 'green' : 'red'} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Recent Invoices</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {invoices.data.slice(0, 5).map((inv) => {
                  const cfg = INVOICE_STATUS_BADGE[inv.status];
                  return (
                    <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                        <p className="text-xs text-gray-400">{inv.organization?.name ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Expenses by Category</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
                  const total = expenses.data.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
                  if (total === 0) return null;
                  return (
                    <div key={cat} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-gray-700">{label}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(total)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Input placeholder="Search by invoice # or client..." value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} className="w-64" />
            <Select options={INVOICE_FILTER_OPTIONS} value={invoiceStatusFilter} onChange={(e) => setInvoiceStatusFilter(e.target.value)} className="w-40" />
          </div>
          <Card>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortableHeader column="invoice_number" currentSort={invoices.sort} order={invoices.order} onSort={invoices.setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Invoice #</SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Organization</th>
                  <SortableHeader column="status" currentSort={invoices.sort} order={invoices.order} onSort={invoices.setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</SortableHeader>
                  <SortableHeader column="due_date" currentSort={invoices.sort} order={invoices.order} onSort={invoices.setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Due</SortableHeader>
                  <SortableHeader column="paid_date" currentSort={invoices.sort} order={invoices.order} onSort={invoices.setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Paid</SortableHeader>
                  <SortableHeader column="total" currentSort={invoices.sort} order={invoices.order} onSort={invoices.setSort} className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500" align="right">Total</SortableHeader>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">No invoices match your search.</td></tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const cfg = INVOICE_STATUS_BADGE[inv.status];
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800">{inv.organization?.name ?? '—'}</p>
                        </td>
                        <td className="px-6 py-4"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(inv.dueDate)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{inv.paidDate ? formatDate(inv.paidDate) : '—'}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(inv.total)}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openInvoiceDelete(inv)} disabled={isCheckingInvDeps} className="text-red-500 hover:text-red-600 hover:bg-red-50">Delete</Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>
          <Pagination page={invoices.page} totalPages={invoices.totalPages} onPageChange={invoices.setPage} className="mt-4" />
        </div>
      )}

      {activeTab === 'expenses' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Select options={EXPENSE_CATEGORY_OPTIONS} value={expenseCategoryFilter} onChange={(e) => setExpenseCategoryFilter(e.target.value)} className="w-48" />
            <span className="text-sm text-gray-500">
              Total: <span className="font-semibold text-gray-900">{formatCurrency(filteredExpenses.reduce((s, e) => s + e.amount, 0))}</span>
            </span>
          </div>
          <Card>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortableHeader column="description" currentSort={expenses.sort} order={expenses.order} onSort={expenses.setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</SortableHeader>
                  <SortableHeader column="category" currentSort={expenses.sort} order={expenses.order} onSort={expenses.setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Category</SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Vendor</th>
                  <SortableHeader column="date" currentSort={expenses.sort} order={expenses.order} onSort={expenses.setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</SortableHeader>
                  <SortableHeader column="amount" currentSort={expenses.sort} order={expenses.order} onSort={expenses.setSort} className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500" align="right">Amount</SortableHeader>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{exp.description}</p>
                      {exp.notes && <p className="text-xs text-gray-400 mt-0.5">{exp.notes}</p>}
                    </td>
                    <td className="px-6 py-4"><Badge variant="gray">{CATEGORY_LABELS[exp.category]}</Badge></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{exp.vendor ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(exp.date)}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(exp.amount)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditExpense(exp)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => setExpenseDeleteTarget(exp)} className="text-red-500 hover:text-red-600 hover:bg-red-50">Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Pagination page={expenses.page} totalPages={expenses.totalPages} onPageChange={expenses.setPage} className="mt-4" />
        </div>
      )}

      {/* Modals */}
      <InvoiceFormModal
        isOpen={invoiceFormOpen}
        onClose={() => setInvoiceFormOpen(false)}
        onSave={handleCreateInvoice}
        organizations={organizations}
        projects={projects}
        nextInvoiceNumber={nextInvoiceNum()}
        catalogItems={catalogItems}
        isSaving={isInvoiceSaving}
        saveError={invoiceSaveError}
      />
      <ExpenseFormModal
        isOpen={expenseFormOpen}
        onClose={closeExpenseForm}
        onSave={handleSaveExpense}
        initial={editingExpense ?? undefined}
        projects={projects}
        isSaving={isExpenseSaving}
        saveError={expenseSaveError}
      />

      {/* Delete confirms */}
      <ConfirmDialog
        isOpen={!!invoiceDeleteTarget}
        onClose={() => setInvoiceDeleteTarget(null)}
        onConfirm={confirmInvoiceDelete}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice "${invoiceDeleteTarget?.invoiceNumber}"?`}
        blockedBy={invoiceDeleteBlockers}
      />
      <ConfirmDialog
        isOpen={!!expenseDeleteTarget}
        onClose={() => setExpenseDeleteTarget(null)}
        onConfirm={confirmExpenseDelete}
        title="Delete Expense"
        description={`Are you sure you want to delete "${expenseDeleteTarget?.description}"? This cannot be undone.`}
      />
    </PageShell>
  );
}

export default FinancesPage;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
