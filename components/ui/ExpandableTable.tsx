'use client';

// Generic table with expandable row detail panels.
// Each row can be clicked to toggle an expanded section beneath it.
// Designed for master-detail views like proposals with line items.
//
// Props:
//   columns        — column definitions with header label and cell renderer
//   rows           — data array
//   getRowId       — function to extract a unique string id from each row
//   renderExpanded — renders the expanded detail panel for a given row
//   emptyMessage   — message shown when rows array is empty

import React, { useState } from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'right' | 'center';
}

interface ExpandableTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  renderExpanded: (row: T) => React.ReactNode;
  emptyMessage?: string;
}

export function ExpandableTable<T>({
  columns,
  rows,
  getRowId,
  renderExpanded,
  emptyMessage = 'No results found.',
}: ExpandableTableProps<T>) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleRow(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-100">
          {/* Expand toggle column */}
          <th className="w-10 px-4 py-3" />
          {columns.map((col) => (
            <th
              key={col.key}
              style={col.width ? { width: col.width } : undefined}
              className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 ${
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                  ? 'text-center'
                  : 'text-left'
              }`}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const id = getRowId(row);
          const isExpanded = expandedId === id;

          return (
            <React.Fragment key={id}>
              <tr
                onClick={() => toggleRow(id)}
                className={`cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50 ${
                  isExpanded ? 'bg-gray-50' : ''
                }`}
              >
                {/* Chevron toggle */}
                <td className="px-4 py-3 text-gray-400">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-gray-700 ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : ''
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
              {isExpanded && (
                <tr className="bg-gray-50">
                  <td colSpan={columns.length + 1} className="px-8 py-4">
                    {renderExpanded(row)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
