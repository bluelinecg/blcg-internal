'use client';

/**
 * Sortable table header cell (<th>).
 * Renders the column label with a sort direction indicator.
 * Active column shows ↑ or ↓; inactive columns show a neutral ↕.
 *
 * Props:
 *   children    — visible column label (text or ReactNode)
 *   column      — DB column name this header sorts on
 *   currentSort — the currently active sort column from state
 *   order       — the currently active sort order ('asc' | 'desc')
 *   onSort      — called with the column name when clicked
 *   align       — text alignment for the header cell (default: 'left')
 *   className   — additional Tailwind classes for the <th>
 */

import type { ReactNode } from 'react';

interface SortableHeaderProps {
  children: ReactNode;
  column: string;
  currentSort: string;
  order: 'asc' | 'desc';
  onSort: (column: string) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function SortableHeader({
  children,
  column,
  currentSort,
  order,
  onSort,
  align = 'left',
  className = '',
}: SortableHeaderProps) {
  const isActive  = currentSort === column;
  const indicator = isActive ? (order === 'asc' ? ' ↑' : ' ↓') : ' ↕';

  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <th className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${alignClass} ${className}`}>
      <button
        onClick={() => onSort(column)}
        className={`flex items-center gap-0.5 transition-colors hover:text-gray-900
          ${align === 'right' ? 'ml-auto' : ''}
          ${isActive ? 'text-gray-900' : 'text-gray-500'}`}
      >
        {children}
        <span className={`text-xs ${isActive ? 'text-brand-blue' : 'text-gray-300'}`}>
          {indicator}
        </span>
      </button>
    </th>
  );
}
