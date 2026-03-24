'use client';

// Pipelines list page — shows all pipelines as cards.
// Create via PipelineFormModal, delete via ConfirmDialog (blocked if items exist).
// Click a pipeline card to open its Kanban view.

import { useState } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Button, Card, Badge, Spinner, ConfirmDialog } from '@/components/ui';
import { useRole } from '@/lib/auth/use-role';
import { useListState } from '@/lib/hooks/use-list-state';
import { PipelineFormModal } from '@/components/modules';
import { getPipelineDeleteBlockers } from '@/lib/utils/dependencies';
import type { Pipeline } from '@/lib/types/pipelines';
import type { PipelineInput } from '@/lib/validations/pipelines';

export function PipelinesPage() {
  const role    = useRole();
  const isAdmin = role === 'admin';
  const canEdit = role !== 'viewer';

  const { data: pipelines, isLoading, error: fetchError, reload } =
    useListState<Pipeline>({ endpoint: '/api/pipelines', defaultSort: 'name', defaultOrder: 'asc' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState<Pipeline | null>(null);
  const [isSaving, setIsSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget]   = useState<Pipeline | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);
  const [isCheckingDeps, setIsCheckingDeps] = useState(false);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  async function handleSave(data: PipelineInput) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const url    = editing ? `/api/pipelines/${editing.id}` : '/api/pipelines';
      const method = editing ? 'PATCH' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json   = await res.json() as { data: Pipeline | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to save pipeline'); return; }
      closeForm();
      reload();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function openDelete(pipeline: Pipeline) {
    setIsCheckingDeps(true);
    setDeleteError(null);
    try {
      const res  = await fetch(`/api/pipelines/${pipeline.id}/items?pageSize=1`);
      const json = await res.json() as { total: number | null; error: string | null };
      const count = json.total ?? 0;
      setDeleteBlockers(getPipelineDeleteBlockers(count));
      setDeleteTarget(pipeline);
    } catch {
      setDeleteError('Could not check pipeline items.');
    } finally {
      setIsCheckingDeps(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res  = await fetch(`/api/pipelines/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) { setDeleteError(json.error ?? 'Failed to delete pipeline'); setDeleteTarget(null); return; }
      setDeleteTarget(null);
      reload();
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setSaveError(null);
  }

  return (
    <PageShell>
      <PageHeader
        title="Pipelines"
        subtitle="Track deals and workflows through custom stages"
        actions={canEdit && (
          <Button onClick={() => { setEditing(null); setSaveError(null); setFormOpen(true); }}>
            + New Pipeline
          </Button>
        )}
      />

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : fetchError ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-red-500">{fetchError}</p>
        </div>
      ) : !pipelines || pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-sm text-gray-400">No pipelines yet.</p>
          {canEdit && (
            <Button onClick={() => { setEditing(null); setSaveError(null); setFormOpen(true); }}>
              Create your first pipeline
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pipelines.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              canEdit={canEdit}
              isAdmin={isAdmin}
              isCheckingDeps={isCheckingDeps}
              onEdit={() => { setEditing(pipeline); setSaveError(null); setFormOpen(true); }}
              onDelete={() => openDelete(pipeline)}
            />
          ))}
        </div>
      )}

      <PipelineFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSave={handleSave}
        initial={editing ? { name: editing.name, description: editing.description, isActive: editing.isActive } : undefined}
        isSaving={isSaving}
        saveError={saveError}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Pipeline"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete Pipeline"
        confirmVariant="danger"
        blockedBy={deleteBlockers}
      />
    </PageShell>
  );
}

export default PipelinesPage;

// --- Pipeline card ---

interface PipelineCardProps {
  pipeline: Pipeline;
  canEdit: boolean;
  isAdmin: boolean;
  isCheckingDeps: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function PipelineCard({ pipeline, canEdit, isAdmin, isCheckingDeps, onEdit, onDelete }: PipelineCardProps) {
  const stageCount = pipeline.stages?.length ?? 0;

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link
            href={`/pipelines/${pipeline.id}`}
            className="text-base font-semibold text-gray-900 hover:text-brand-blue transition-colors truncate block"
          >
            {pipeline.name}
          </Link>
          {pipeline.description && (
            <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">{pipeline.description}</p>
          )}
        </div>
        <Badge variant={pipeline.isActive ? 'green' : 'gray'}>
          {pipeline.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Stage pills */}
      {pipeline.stages && pipeline.stages.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[...pipeline.stages]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((stage) => (
              <span
                key={stage.id}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: stage.color }}
              >
                {stage.name}
              </span>
            ))}
        </div>
      )}

      {stageCount === 0 && (
        <p className="text-xs text-gray-400">No stages — open to add some.</p>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <Link href={`/pipelines/${pipeline.id}`} className="text-xs text-brand-blue hover:underline">
          Open board →
        </Link>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={onEdit}
              className="text-xs text-gray-400 hover:text-brand-blue transition-colors"
            >
              Edit
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onDelete}
              disabled={isCheckingDeps}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
