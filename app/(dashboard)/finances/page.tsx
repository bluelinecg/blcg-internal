'use client';

// Finances page — full CRUD via local state.
// Invoices: create via InvoiceFormModal, delete with dependency check.
// Expenses: create/edit via ExpenseFormModal, delete freely.

import { useState, useMemo } from 'react';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Tabs, StatCard, Card, Badge, Select, Input, Button, ConfirmDialog } from '@/components/ui';
import type { TabItem } from '@/components/ui/Tabs';
import { InvoiceFormModal, ExpenseFormModal } from '@/components/modules';
import { MOCK_INVOICES, MOCK_EXPENSES } from '@/lib/mock/finances';
import { MOCK_CLIENTS } from '@/lib/mock/clients';
import { MOCK_PROJECTS } from '@/lib/mock/projects';
import { getInvoiceDeleteBlockers } from '@/lib/utils/dependencies';
import type { Invoice, Expense, InvoiceStatus, ExpenseCategory } from '@/lib/types/finances';

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

const CLIENT_MAP = Object.fromEntries(MOCK_CLIENTS.map((c) => [c.id, c]));

function nextInvoiceNum(invoices: Invoice[]): string {
  const year = new Date().getFullYear();
  const max = invoices
    .map((i) => parseInt(i.invoiceNumber.split('-')[2] ?? '0', 10))
    .reduce((a, b) => Math.max(a, b), 0);
  return `INV-${year}-${String(max + 1).padStart(3, '0')}`;
}

export function FinancesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [activeTab, setActiveTab] = useState('overview');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');

  // Invoice CRUD
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [invoiceDeleteTarget, setInvoiceDeleteTarget] = useState<Invoice | null>(null);
  const [invoiceDeleteBlockers, setInvoiceDeleteBlockers] = useState<string[]>([]);

  // Expense CRUD
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseDeleteTarget, setExpenseDeleteTarget] = useState<Expense | null>(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const client = CLIENT_MAP[inv.clientId];
      const q = invoiceSearch.toLowerCase();
      const matchesSearch = q === '' || inv.invoiceNumber.toLowerCase().includes(q) || (client?.name.toLowerCase().includes(q) ?? false);
      const matchesStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, invoiceSearch, invoiceStatusFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => expenseCategoryFilter === 'all' || exp.category === expenseCategoryFilter);
  }, [expenses, expenseCategoryFilter]);

  // Invoice handlers
  function handleCreateInvoice(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    setInvoices((prev) => [...prev, { ...data, id: `inv_${Date.now()}`, createdAt: now, updatedAt: now }]);
  }

  function openInvoiceDelete(inv: Invoice) {
    setInvoiceDeleteBlockers(getInvoiceDeleteBlockers(inv.status));
    setInvoiceDeleteTarget(inv);
  }

  function confirmInvoiceDelete() {
    if (!invoiceDeleteTarget) return;
    setInvoices((prev) => prev.filter((i) => i.id !== invoiceDeleteTarget.id));
    setInvoiceDeleteTarget(null);
  }

  // Expense handlers
  function handleSaveExpense(data: Omit<Expense, 'id' | 'createdAt'>) {
    const now = new Date().toISOString();
    if (editingExpense) {
      setExpenses((prev) => prev.map((e) => e.id === editingExpense.id ? { ...e, ...data } : e));
    } else {
      setExpenses((prev) => [...prev, { ...data, id: `exp_${Date.now()}`, createdAt: now }]);
    }
  }

  function openEditExpense(exp: Expense) {
    setEditingExpense(exp);
    setExpenseFormOpen(true);
  }

  function confirmExpenseDelete() {
    if (!expenseDeleteTarget) return;
    setExpenses((prev) => prev.filter((e) => e.id !== expenseDeleteTarget.id));
    setExpenseDeleteTarget(null);
  }

  function closeExpenseForm() {
    setExpenseFormOpen(false);
    setEditingExpense(null);
  }

  // Derived totals
  const totalRevenue    = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalOutstanding = invoices.filter((i) => ['sent','viewed','overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0);
  const totalExpenses   = expenses.reduce((s, e) => s + e.amount, 0);
  const netPL           = totalRevenue - totalExpenses;
  const overdueCount    = invoices.filter((i) => i.status === 'overdue').length;

  return (
    <PageShell>
      <PageHeader
        title="Finances"
        subtitle="Revenue, invoices, and expense tracking"
        actions={
          activeTab === 'invoices' ? (
            <Button onClick={() => setInvoiceFormOpen(true)}>+ New Invoice</Button>
          ) : activeTab === 'expenses' ? (
            <Button onClick={() => { setEditingExpense(null); setExpenseFormOpen(true); }}>+ New Expense</Button>
          ) : undefined
        }
      />

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
                  const client = CLIENT_MAP[inv.clientId];
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
                    const client = CLIENT_MAP[inv.clientId];
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
                          <Button variant="ghost" size="sm" onClick={() => openInvoiceDelete(inv)} className="text-red-500 hover:text-red-600 hover:bg-red-50">Delete</Button>
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
        clients={MOCK_CLIENTS}
        projects={MOCK_PROJECTS}
        nextInvoiceNumber={nextInvoiceNum(invoices)}
      />
      <ExpenseFormModal
        isOpen={expenseFormOpen}
        onClose={closeExpenseForm}
        onSave={handleSaveExpense}
        initial={editingExpense ?? undefined}
        projects={MOCK_PROJECTS}
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
