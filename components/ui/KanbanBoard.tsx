'use client';

// Generic Kanban board with HTML5 drag-and-drop between columns and within columns.
// No external library required — uses native draggable API.
//
// Props:
//   columns          — ordered column definitions with id and label
//   items            — full data array (pre-sorted by sortOrder)
//   getItemId        — extract unique string id from an item
//   getItemColumn    — returns the column id the item currently belongs to
//   onMoveItem       — called when an item is dropped into a different column
//   onReorderColumn  — optional; called when an item is dropped within the same column
//                      receives (columnId, orderedIds[]) with the new order
//   renderCard       — renders the card UI for a given item
//   columnAccent     — optional map of column id → Tailwind border-top color class

import { useState } from 'react';
import { moveItem } from '@/lib/utils/reorder';

export interface KanbanColumn {
  id: string;
  label: string;
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn[];
  items: T[];
  getItemId: (item: T) => string;
  getItemColumn: (item: T) => string;
  onMoveItem: (itemId: string, toColumnId: string) => void;
  onReorderColumn?: (columnId: string, orderedIds: string[]) => void;
  renderCard: (item: T) => React.ReactNode;
  columnAccent?: Record<string, string>;
}

export function KanbanBoard<T>({
  columns,
  items,
  getItemId,
  getItemColumn,
  onMoveItem,
  onReorderColumn,
  renderCard,
  columnAccent = {},
}: KanbanBoardProps<T>) {
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  // The card id the dragged card is hovering above (insertion point indicator)
  const [overItemId, setOverItemId]   = useState<string | null>(null);

  function handleDragStart(itemId: string) {
    setDraggingId(itemId);
  }

  function handleDragOver(e: React.DragEvent, columnId: string) {
    e.preventDefault();
    setOverColumnId(columnId);
  }

  function handleDragOverCard(e: React.DragEvent, cardId: string) {
    e.preventDefault();
    e.stopPropagation();
    setOverItemId(cardId);
  }

  function handleDragLeaveCard(e: React.DragEvent) {
    // Only clear when actually leaving the card element (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setOverItemId(null);
    }
  }

  function handleDropOnCard(columnId: string, colItems: T[], targetId: string) {
    if (!draggingId) return;

    const sourceColumnId = getItemColumn(
      items.find((item) => getItemId(item) === draggingId) as T,
    );

    if (sourceColumnId === columnId) {
      // Same column — reorder
      if (onReorderColumn) {
        const fromIndex = colItems.findIndex((item) => getItemId(item) === draggingId);
        const toIndex   = colItems.findIndex((item) => getItemId(item) === targetId);
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          const reordered = moveItem(colItems, fromIndex, toIndex);
          onReorderColumn(columnId, reordered.map(getItemId));
        }
      }
    } else {
      // Different column — status change
      onMoveItem(draggingId, columnId);
    }

    setDraggingId(null);
    setOverColumnId(null);
    setOverItemId(null);
  }

  function handleDrop(columnId: string) {
    // Only fires when dropping on the empty area below all cards
    if (overItemId) return;
    if (draggingId && columnId) {
      onMoveItem(draggingId, columnId);
    }
    setDraggingId(null);
    setOverColumnId(null);
    setOverItemId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setOverColumnId(null);
    setOverItemId(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {columns.map((col) => {
        const colItems = items.filter((item) => getItemColumn(item) === col.id);
        const isOver = overColumnId === col.id;
        const accentClass = columnAccent[col.id] ?? 'border-t-gray-300';

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={() => handleDrop(col.id)}
            className={`flex flex-col flex-1 min-w-52 h-full rounded-lg border border-gray-200 border-t-4 transition-colors ${accentClass} ${
              isOver ? 'bg-brand-blue/5 border-brand-blue/30' : 'bg-gray-50'
            }`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-700">{col.label}</span>
              <span className="text-xs font-medium text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
                {colItems.length}
              </span>
            </div>

            {/* Cards — scrolls independently when the list is long */}
            <div className="flex flex-col gap-2 p-3 flex-1 min-h-0 overflow-y-auto">
              {colItems.map((item) => {
                const id = getItemId(item);
                const isDragging    = draggingId === id;
                const isInsertPoint = overItemId === id && draggingId !== id;

                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handleDragStart(id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOverCard(e, id)}
                    onDragLeave={handleDragLeaveCard}
                    onDrop={(e) => { e.stopPropagation(); handleDropOnCard(col.id, colItems, id); }}
                    className={`rounded-md bg-white border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${
                      isDragging ? 'opacity-40' : 'opacity-100'
                    } ${isInsertPoint ? 'border-t-2 border-t-brand-blue' : ''}`}
                  >
                    {renderCard(item)}
                  </div>
                );
              })}
              {colItems.length === 0 && (
                <div className="flex items-center justify-center py-6 rounded-md border-2 border-dashed border-gray-200">
                  <p className="text-xs text-gray-400">No items</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
