'use client';

// Modal for managing stages within a pipeline.
// Supports: add stage, rename, change color, mark as won/lost, reorder (move up/down), delete (if empty).
//
// Props:
//   isOpen      — controls visibility
//   onClose     — dismiss callback
//   pipelineId  — the pipeline whose stages are being managed
//   stages      — current ordered stage list
//   onSave      — called after any change; parent refreshes stages from this callback

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui';
import type { PipelineStage } from '@/lib/types/pipelines';

// Predefined palette — avoids arbitrary hex input while giving enough variety
const COLOR_PALETTE = [
  { hex: '#6B7280', label: 'Gray' },
  { hex: '#3B82F6', label: 'Blue' },
  { hex: '#8B5CF6', label: 'Purple' },
  { hex: '#EC4899', label: 'Pink' },
  { hex: '#F59E0B', label: 'Amber' },
  { hex: '#EF4444', label: 'Red' },
  { hex: '#10B981', label: 'Green' },
  { hex: '#06B6D4', label: 'Cyan' },
];

interface PipelineStagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineId: string;
  stages: PipelineStage[];
  onSave: () => void;
}

interface NewStageForm {
  name: string;
  color: string;
  isWon: boolean;
  isLost: boolean;
}

export function PipelineStagesModal({ isOpen, onClose, pipelineId, stages, onSave }: PipelineStagesModalProps) {
  const [newStage, setNewStage] = useState<NewStageForm>({ name: '', color: '#6B7280', isWon: false, isLost: false });
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editName, setEditName]     = useState('');
  const [editColor, setEditColor]   = useState('');
  const [editWon, setEditWon]       = useState(false);
  const [editLost, setEditLost]     = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PipelineStage | null>(null);
  const [deleteError, setDeleteError]   = useState<string | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);

  function startEdit(stage: PipelineStage) {
    setEditingId(stage.id);
    setEditName(stage.name);
    setEditColor(stage.color);
    setEditWon(stage.isWon);
    setEditLost(stage.isLost);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(stage: PipelineStage) {
    if (!editName.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/stages/${stage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor, isWon: editWon, isLost: editLost }),
      });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) return;
      setEditingId(null);
      onSave();
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function moveStage(stage: PipelineStage, direction: 'up' | 'down') {
    const sorted = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s) => s.id === stage.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const sibling = sorted[swapIdx];
    await Promise.all([
      fetch(`/api/pipelines/${pipelineId}/stages/${stage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: sibling.sortOrder }),
      }),
      fetch(`/api/pipelines/${pipelineId}/stages/${sibling.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: stage.sortOrder }),
      }),
    ]);
    onSave();
  }

  async function addStage() {
    if (!newStage.name.trim()) { setAddError('Stage name is required.'); return; }
    setIsAdding(true);
    setAddError(null);
    try {
      const maxOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.sortOrder)) : -1;
      const res = await fetch(`/api/pipelines/${pipelineId}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStage.name.trim(),
          color: newStage.color,
          sortOrder: maxOrder + 1,
          isWon: newStage.isWon,
          isLost: newStage.isLost,
        }),
      });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) { setAddError(json.error ?? 'Failed to add stage'); return; }
      setNewStage({ name: '', color: '#6B7280', isWon: false, isLost: false });
      onSave();
    } finally {
      setIsAdding(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res  = await fetch(`/api/pipelines/${pipelineId}/stages/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) {
        setDeleteError(json.error ?? 'Failed to delete stage');
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      onSave();
    } finally {
      setIsDeleting(false);
    }
  }

  const sorted = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Manage Stages" size="lg">
        <div className="px-6 py-5 space-y-5">
          {deleteError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-600">{deleteError}</p>
            </div>
          )}

          {/* Existing stages */}
          {sorted.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No stages yet. Add one below.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sorted.map((stage, idx) => (
                <li key={stage.id} className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2">
                  {/* Color swatch */}
                  <span className="flex-shrink-0 h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />

                  {editingId === stage.id ? (
                    <div className="flex flex-1 items-center gap-2 flex-wrap">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-40"
                      />
                      {/* Color picker */}
                      <div className="flex gap-1 flex-wrap">
                        {COLOR_PALETTE.map((c) => (
                          <button
                            key={c.hex}
                            title={c.label}
                            onClick={() => setEditColor(c.hex)}
                            className={`h-5 w-5 rounded-full border-2 transition-transform ${editColor === c.hex ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                      <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={editWon} onChange={(e) => { setEditWon(e.target.checked); if (e.target.checked) setEditLost(false); }} className="h-3 w-3" />
                        Won
                      </label>
                      <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={editLost} onChange={(e) => { setEditLost(e.target.checked); if (e.target.checked) setEditWon(false); }} className="h-3 w-3" />
                        Lost
                      </label>
                      <div className="flex gap-1 ml-auto">
                        <Button size="sm" onClick={() => saveEdit(stage)} disabled={isSavingEdit}>{isSavingEdit ? '…' : 'Save'}</Button>
                        <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-gray-800">{stage.name}</span>
                      {stage.isWon && <span className="text-xs bg-green-100 text-green-700 rounded px-1.5 py-0.5">Won</span>}
                      {stage.isLost && <span className="text-xs bg-red-100 text-red-600 rounded px-1.5 py-0.5">Lost</span>}
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => moveStage(stage, 'up')}
                          disabled={idx === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-20 px-1"
                          aria-label="Move up"
                        >↑</button>
                        <button
                          onClick={() => moveStage(stage, 'down')}
                          disabled={idx === sorted.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-20 px-1"
                          aria-label="Move down"
                        >↓</button>
                        <button
                          onClick={() => startEdit(stage)}
                          className="text-xs text-gray-400 hover:text-brand-blue transition-colors px-1"
                        >✎</button>
                        <button
                          onClick={() => { setDeleteError(null); setDeleteTarget(stage); }}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
                        >✕</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add new stage */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add Stage</p>
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                placeholder="Stage name…"
                value={newStage.name}
                onChange={(e) => { setNewStage((prev) => ({ ...prev, name: e.target.value })); setAddError(null); }}
                className="w-44"
                error={addError ?? undefined}
              />
              <div className="flex gap-1 flex-wrap">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    title={c.label}
                    onClick={() => setNewStage((prev) => ({ ...prev, color: c.hex }))}
                    className={`h-5 w-5 rounded-full border-2 transition-transform ${newStage.color === c.hex ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={newStage.isWon} onChange={(e) => setNewStage((prev) => ({ ...prev, isWon: e.target.checked, isLost: e.target.checked ? false : prev.isLost }))} className="h-3 w-3" />
                Won
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={newStage.isLost} onChange={(e) => setNewStage((prev) => ({ ...prev, isLost: e.target.checked, isWon: e.target.checked ? false : prev.isWon }))} className="h-3 w-3" />
                Lost
              </label>
              <Button size="sm" onClick={addStage} disabled={isAdding}>{isAdding ? 'Adding…' : '+ Add'}</Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={onClose}>Done</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Stage"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete Stage"
        confirmVariant="danger"
      />
    </>
  );
}
