'use client';

// Modal for selecting a catalog item to insert as a line item preset.
// Displays only active catalog items, searchable by name or category.
// Props:
//   isOpen    — controls visibility
//   onClose   — dismiss callback
//   onSelect  — called with the selected item's name, description, and unitPrice

import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui';
import type { CatalogItem } from '@/lib/types/catalog';

interface CatalogItemPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: Pick<CatalogItem, 'name' | 'description' | 'unitPrice'>) => void;
  items: CatalogItem[];
}

export function CatalogItemPickerModal({
  isOpen,
  onClose,
  onSelect,
  items,
}: CatalogItemPickerModalProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q),
    );
  }, [items, search]);

  function handleSelect(item: CatalogItem) {
    onSelect({ name: item.name, description: item.description, unitPrice: item.unitPrice });
    setSearch('');
    onClose();
  }

  function handleClose() {
    setSearch('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add from Catalog">
      <div className="px-6 py-4 space-y-3">
        <Input
          placeholder="Search catalog..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-sm text-gray-400">
                {items.length === 0 ? 'No catalog items yet.' : 'No items match your search.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      {(item.description || item.category) && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {item.category ? `${item.category}${item.description ? ' — ' : ''}` : ''}
                          {item.description ?? ''}
                        </p>
                      )}
                    </div>
                    <span className="ml-4 shrink-0 text-sm font-semibold text-gray-900">
                      {formatCurrency(item.unitPrice)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
