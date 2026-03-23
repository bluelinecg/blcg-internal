'use client';

// Finances page — live data via /api/invoices and /api/expenses.
// Invoices: create via InvoiceFormModal, delete with dependency check via /api/invoices/[id]/blockers.
// Expenses: create/edit via ExpenseFormModal, delete freely.

import { useState, useEffect, useMemo } from 'react';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Tabs, StatCard, Card, Badge, Select, Input, Button, ConfirmDialog, Spinner } from '@/components/ui';
import type { TabItem } from '@/components/ui/Tabs';
import { InvoiceFormModal, ExpenseFormModal } from '@/components/modules';
import type { Invoice, Expense, InvoiceStatus, ExpenseCategory } from '@/lib/types/finances';
import type { Client } from '@/lib/types/clients';
import type { Project } from '@/lib/types/projects';

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
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [clients, setClients]     = useState<Client[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');

  // Invoice CRUD
  const [invoiceFormOpen, setInvoiceFormOpen]         = useState(false);
  const [invoiceDeleteTarget, setInvoiceDeleteTarget] = useState<Invoice | null>(null);
  const [invoiceDeleteBlockers, setInvoiceDeleteBlockers] = useState<string[]>([]);
  const [isCheckingInvDeps, setIsCheckingInvDeps]     = useState(false);
  const [isInvoiceSaving, setIsInvoiceSaving]         = useState(false);
  const [invoiceSaveError, setInvoiceSaveError]       = useState<string | null>(null);
  const [isInvoiceDeleting, setIsInvoiceDeleting]     = useState(false);
  const [invoiceDeleteError, setInvoiceDeleteError]   = useState<string | null>(null);

  // Expense CRUD
  const [expenseFormOpen, setExpenseFormOpen]     = useState(false);
  const [editingExpense, setEditingExpense]         = useState<Expense | null>(null);
  const [expenseDeleteTarget, setExpenseDeleteTarget] = useState<Expense | null>(null);
  const [isExpenseSaving, setIsExpenseSaving]       = useState(false);
  const [expenseSaveError, setExpenseSaveError]     = useState<string | null>(null);
  const [isExpenseDeleting, setIsExpenseDeleting]   = useState(false);
  const [expenseDeleteError, setExpenseDeleteError] = useState<string | null>(null);

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [invRes, expRes, cliRes, projRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/expenses'),
        fetch('/api/clients'),
        fetch('/api/projects'),
      ]);
      const [invJson, expJson, cliJson, projJson] = await Promise.all([
        invRes.json() as Promise<{ data: Invoice[] | null; error: string | null }>,
        expRes.json() as Promise<{ data: Expense[] | null; error: string | null }>,
        cliRes.json() as Promise<{ data: Client[] | null; error: string | null }>,
        projRes.json() as Promise<{ data: Project[] | null; error: string | null }>,
      ]);
      if (!invRes.ok || invJson.error) { setFetchError(invJson.error ?? 'Failed to load invoices'); return; }
      setInvoices(invJson.data ?? []);
      setExpenses(expJson.data ?? []);
      setClients(cliJson.data ?? []);
      setProjects(projJson.data ?? []);
    } catch {
      setFetchError('Failed to load finances data');
    } finally {
      setIsLoading(false);
    }
  }

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c])),
    [clients],
  );

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const client = clientMap[inv.clientId];
      const q = invoiceSearch.toLowerCase();
      const matchesSearch = q === '' || inv.invoiceNumber.toLowerCase().includes(q) || (client?.name.toLowerCase().includes(q) ?? false);
      const matchesStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, invoiceSearch, invoiceStatusFilter, clientMap]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => expenseCategoryFilter === 'all' || exp.category === expenseCategoryFilter);
  }, [expenses, expenseCategoryFilter]);

  // --- Invoice handlers ---

  function nextInvoiceNum(): string {
    const year = new Date().getFullYear();
    const prefix = `BL-${year}-`;
    const max = invoices
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
      if (json.data) setInvoices((prev) => [json.data!, ...prev]);
      setInvoiceFormOpen(false);
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
      setInvoices((prev) => prev.filter((i) => i.id !== invoiceDeleteTarget.id));
      setInvoiceDeleteTarget(null);
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
        if (json.data) setExpenses((prev) => prev.map((e) => (e.id === editingExpense.id ? json.data! : e)));
      } else {
        const res  = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json() as { data: Expense | null; error: string | null };
        if (!res.ok || json.error) { setExpenseSaveError(json.error ?? 'Failed to create expense'); return; }
        if (json.data) setExpenses((prev) => [json.data!, ...prev]);
      }
      closeExpenseForm();
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
      setExpenses((prev) => prev.filter((e) => e.id !== expenseDeleteTarget.id));
      setExpenseDeleteTarget(null);
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

  // Derived totals
  const totalRevenue     = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalOutstanding = invoices.filter((i) => ['sent', 'viewed', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0);
  const totalExpenses    = expenses.reduce((s, e) => s + e.amount, 0);
  const netPL            = totalRevenue - totalExpenses;
  const overdueCount     = invoices.filter((i) => i.status === 'overdue').length;

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
            <StatCard label="Total Expenses" value={formatCurrency(totalExpenses)} accent="yellow" />
            <StatCard label="Net P&L" value={formatCurrency(netPL)} sub="Revenue minus expenses" accent={netPL >= 0 ? 'green' : 'red'} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Recent Invoices</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {invoices.slice(0, 5).map((inv) => {
                  const client = clientMap[inv.clientId];
                  const cfg = INVOICE_STATUS_BADGE[inv.status];
                  return (
                    <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                        <p className="text-xs text-gray-400">{client?.name ?? '—'}</p>
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
                  const total = expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0);
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
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Due</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Paid</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">No invoices match your search.</td></tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const client = clientMap[inv.clientId];
                    const cfg = INVOICE_STATUS_BADGE[inv.status];
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-800">{client?.name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{client?.contactName ?? ''}</p>
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
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
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
        </div>
      )}

      {/* Modals */}
      <InvoiceFormModal
        isOpen={invoiceFormOpen}
        onClose={() => setInvoiceFormOpen(false)}
        onSave={handleCreateInvoice}
        clients={clients}
        projects={projects}
        nextInvoiceNumber={nextInvoiceNum()}
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
