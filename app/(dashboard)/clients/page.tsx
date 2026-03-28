'use client';

// Clients list page — fetches live data from /api/clients (paginated, sortable).
// Text search and status filter run client-side against the current page.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Button, Card, Input, Select, Spinner, Pagination, SortableHeader } from '@/components/ui';
import { StatusBadge } from '@/components/modules';
import { useListState } from '@/lib/hooks/use-list-state';
import type { Client, ClientStatus } from '@/lib/types/clients';

type StatusFilter = ClientStatus | 'all';

const STATUS_FILTER_OPTIONS = [
  { value: 'all',      label: 'All Clients' },
  { value: 'active',   label: 'Active' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'inactive', label: 'Inactive' },
];

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data, isLoading, error, page, totalPages, totalRecords, sort, order, setPage, setSort } =
    useListState<Client>({ endpoint: '/api/clients', defaultSort: 'name' });

  const filtered = useMemo(() => {
    return data.filter((client) => {
      const q = search.toLowerCase();
      const matchesSearch =
        q === '' ||
        client.name.toLowerCase().includes(q) ||
        client.contactName.toLowerCase().includes(q) ||
        client.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  return (
    <PageShell>
      <PageHeader
        title="Clients"
        subtitle={isLoading ? 'Loading…' : `${totalRecords} total clients`}
        actions={
          <Link href="/clients/new">
            <Button>+ New Client</Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <Input
          placeholder="Search by company, contact, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72"
        />
        <Select
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="w-full sm:w-40"
        />
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-400">No clients match your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <SortableHeader column="name" currentSort={sort} order={order} onSort={setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Client</SortableHeader>
                  <SortableHeader column="contact_name" currentSort={sort} order={order} onSort={setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Contact</SortableHeader>
                  <SortableHeader column="email" currentSort={sort} order={order} onSort={setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Email</SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Phone</th>
                  <SortableHeader column="status" currentSort={sort} order={order} onSort={setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</SortableHeader>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((client) => (
                  <tr key={client.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-semibold text-brand-blue">
                          {getInitials(client.name)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{client.contactName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{client.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{client.phone ?? '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={client.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="ghost" size="sm">View →</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />
    </PageShell>
  );
}

export default ClientsPage;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
