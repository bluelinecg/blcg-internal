'use client';

// Pipeline kanban page — shows all stages as columns and items as draggable cards.
// Items can be created per-column, edited, moved by drag-and-drop, and deleted.
// Stages can be managed via PipelineStagesModal.
// Pipeline metadata (name, description) editable via PipelineFormModal.

import { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Button, KanbanBoard, Badge, Spinner, ConfirmDialog, Tabs } from '@/components/ui';
import { useRole } from '@/lib/auth/use-role';
import { PipelineFormModal, PipelineItemFormModal, PipelineStagesModal } from '@/components/modules';
import type { Pipeline, PipelineItem, PipelineStage } from '@/lib/types/pipelines';
import type { Contact } from '@/lib/types/crm';
import type { Client } from '@/lib/types/clients';
import type { PipelineInput, PipelineItemInput } from '@/lib/validations/pipelines';
import type { AutomationRule } from '@/lib/types/automations';
import { PipelineAutomationsTab } from './automations-tab';

interface PageProps {
  params: Promise<{ id: string }>;
}

export function PipelineDetailPage({ params }: PageProps) {
  const { id: pipelineId } = use(params);

  const role    = useRole();
  const isAdmin = role === 'admin';
  const canEdit = role !== 'viewer';

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [items, setItems]       = useState<PipelineItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clients, setClients]   = useState<Client[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Pipeline edit modal
  const [editPipelineOpen, setEditPipelineOpen] = useState(false);
  const [isSavingPipeline, setIsSavingPipeline]   = useState(false);
  const [savePipelineError, setSavePipelineError] = useState<string | null>(null);

  // Stages modal
  const [stagesOpen, setStagesOpen] = useState(false);

  // Item form modal
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem]   = useState<PipelineItem | null>(null);
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>(undefined);
  const [isSavingItem, setIsSavingItem]   = useState(false);
  const [saveItemError, setSaveItemError] = useState<string | null>(null);

  // Delete item
  const [deleteTarget, setDeleteTarget] = useState<PipelineItem | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  // Tabs and automations
  const [activeTab, setActiveTab] = useState<'kanban' | 'automations'>('kanban');
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);

  useEffect(() => { void loadAll(); }, [pipelineId]);

  async function loadAll() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [pipelineRes, itemsRes, contactsRes, clientsRes, automationsRes] = await Promise.all([
        fetch(`/api/pipelines/${pipelineId}`),
        fetch(`/api/pipelines/${pipelineId}/items?pageSize=100`),
        fetch('/api/contacts?pageSize=100&sort=first_name'),
        fetch('/api/clients?pageSize=100&sort=name'),
        fetch('/api/automations'),
      ]);
      const [pj, ij, coj, clj, aj] = await Promise.all([
        pipelineRes.json() as Promise<{ data: Pipeline | null; error: string | null }>,
        itemsRes.json() as Promise<{ data: PipelineItem[] | null; error: string | null }>,
        contactsRes.json() as Promise<{ data: Contact[] | null; error: string | null }>,
        clientsRes.json() as Promise<{ data: Client[] | null; error: string | null }>,
        automationsRes.json() as Promise<{ data: AutomationRule[] | null; error: string | null }>,
      ]);

      if (!pipelineRes.ok || pj.error) { setFetchError(pj.error ?? 'Failed to load pipeline'); return; }
      if (!itemsRes.ok  || ij.error)  { setFetchError(ij.error  ?? 'Failed to load items');    return; }

      setPipeline(pj.data);
      setItems(ij.data ?? []);
      setContacts(coj.data ?? []);
      setClients(clj.data ?? []);
      // Filter automations for pipeline.item_stage_changed trigger
      const pipelineAutomations = (aj.data ?? []).filter(
        (rule) => rule.triggerType === 'pipeline.item_stage_changed' && rule.isActive
      );
      setAutomationRules(pipelineAutomations);
    } catch {
      setFetchError('Failed to load pipeline');
    } finally {
      setIsLoading(false);
    }
  }

  // --- Drag-and-drop stage move ---

  async function handleMoveItem(itemId: string, toStageId: string) {
    // Optimistic update
    setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, stageId: toStageId } : it));
    try {
      const res  = await fetch(`/api/pipelines/${pipelineId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: toStageId }),
      });
      const json = await res.json() as { data: PipelineItem | null; error: string | null };
      if (!res.ok || json.error) void loadAll();
      else if (json.data) setItems((prev) => prev.map((it) => it.id === itemId ? json.data! : it));
    } catch {
      void loadAll();
    }
  }

  // --- Pipeline edit ---

  async function handleSavePipeline(data: PipelineInput) {
    if (!pipeline) return;
    setIsSavingPipeline(true);
    setSavePipelineError(null);
    try {
      const res  = await fetch(`/api/pipelines/${pipelineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: Pipeline | null; error: string | null };
      if (!res.ok || json.error) { setSavePipelineError(json.error ?? 'Failed to save'); return; }
      if (json.data) setPipeline(json.data);
      setEditPipelineOpen(false);
    } catch {
      setSavePipelineError('Network error. Please try again.');
    } finally {
      setIsSavingPipeline(false);
    }
  }

  // --- Item create/edit ---

  async function handleSaveItem(data: Omit<PipelineItemInput, 'pipelineId'>) {
    setIsSavingItem(true);
    setSaveItemError(null);
    try {
      const url    = editingItem ? `/api/pipelines/${pipelineId}/items/${editingItem.id}` : `/api/pipelines/${pipelineId}/items`;
      const method = editingItem ? 'PATCH' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json   = await res.json() as { data: PipelineItem | null; error: string | null };
      if (!res.ok || json.error) { setSaveItemError(json.error ?? 'Failed to save item'); return; }
      if (json.data) {
        if (editingItem) {
          setItems((prev) => prev.map((it) => it.id === editingItem.id ? json.data! : it));
        } else {
          setItems((prev) => [...prev, json.data!]);
        }
      }
      closeItemForm();
    } catch {
      setSaveItemError('Network error. Please try again.');
    } finally {
      setIsSavingItem(false);
    }
  }

  async function confirmDeleteItem() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res  = await fetch(`/api/pipelines/${pipelineId}/items/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) { setDeleteError(json.error ?? 'Failed to delete item'); setDeleteTarget(null); return; }
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  function openItemFormForStage(stageId: string) {
    setEditingItem(null);
    setDefaultStageId(stageId);
    setSaveItemError(null);
    setItemFormOpen(true);
  }

  function openItemFormForEdit(item: PipelineItem) {
    setEditingItem(item);
    setDefaultStageId(undefined);
    setSaveItemError(null);
    setItemFormOpen(true);
  }

  function closeItemForm() {
    setItemFormOpen(false);
    setEditingItem(null);
    setSaveItemError(null);
  }

  const stages = useMemo(
    () => [...(pipeline?.stages ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [pipeline],
  );

  const columns = useMemo(
    () => stages.map((s) => ({ id: s.id, label: s.name })),
    [stages],
  );

  const columnAccent = useMemo(
    () => Object.fromEntries(stages.map((s) => [s.id, `border-t-[${s.color}]`])),
    [stages],
  );

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      </PageShell>
    );
  }

  if (fetchError || !pipeline) {
    return (
      <PageShell>
        <p className="text-sm text-red-500">{fetchError ?? 'Pipeline not found'}</p>
        <Link href="/pipelines" className="mt-4 inline-flex items-center text-sm text-brand-blue hover:underline">← Back to Pipelines</Link>
      </PageShell>
    );
  }

  return (
    <PageShell scrollable={false}>
      {/* Back link */}
      <Link
        href="/pipelines"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        ← Back to Pipelines
      </Link>

      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{pipeline.name}</h2>
            {pipeline.description && (
              <p className="mt-0.5 text-sm text-gray-500">{pipeline.description}</p>
            )}
          </div>
          <Badge variant={pipeline.isActive ? 'green' : 'gray'}>
            {pipeline.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={() => { setSavePipelineError(null); setEditPipelineOpen(true); }}>
              Edit Pipeline
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => setStagesOpen(true)}>
              Manage Stages
            </Button>
          )}
        </div>
      </div>

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      {/* Tabs — only show to admins */}
      {isAdmin && (
        <Tabs
          tabs={[
            { id: 'kanban', label: 'Kanban Board' },
            { id: 'automations', label: 'Automations' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'kanban' | 'automations')}
          className="mb-6"
        />
      )}

      {/* Kanban View */}
      {activeTab === 'kanban' && (
        <>
          {stages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-sm text-gray-400">No stages yet.</p>
              {canEdit && (
                <Button onClick={() => setStagesOpen(true)}>Add Stages</Button>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden">
              <KanbanBoard
                columns={columns}
                items={items}
                getItemId={(item) => item.id}
                getItemColumn={(item) => item.stageId}
                onMoveItem={handleMoveItem}
                columnAccent={columnAccent}
                renderCard={(item) => (
                  <PipelineItemCard
                    item={item}
                    stages={stages}
                    canEdit={canEdit}
                    isAdmin={isAdmin}
                    onEdit={() => openItemFormForEdit(item)}
                    onDelete={() => setDeleteTarget(item)}
                    onAddToStage={canEdit ? openItemFormForStage : undefined}
                    hasAutomations={automationRules.length > 0}
                  />
                )}
              />
            </div>
          )}

          {/* Add item per stage — shown as a row of buttons below empty-state only when there are stages */}
          {stages.length > 0 && canEdit && (
            <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => openItemFormForStage(stage.id)}
                  className="flex-shrink-0 min-w-52 text-left text-xs text-brand-blue hover:underline px-1"
                >
                  + Add item to {stage.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Automations View */}
      {activeTab === 'automations' && (
        <PipelineAutomationsTab pipelineId={pipelineId} onRulesChange={setAutomationRules} />
      )}

      {/* Modals */}
      <PipelineFormModal
        isOpen={editPipelineOpen}
        onClose={() => setEditPipelineOpen(false)}
        onSave={handleSavePipeline}
        initial={{ name: pipeline.name, description: pipeline.description, isActive: pipeline.isActive }}
        isSaving={isSavingPipeline}
        saveError={savePipelineError}
      />

      <PipelineStagesModal
        isOpen={stagesOpen}
        onClose={() => setStagesOpen(false)}
        pipelineId={pipelineId}
        stages={pipeline.stages ?? []}
        onSave={() => { void loadAll(); }}
      />

      <PipelineItemFormModal
        isOpen={itemFormOpen}
        onClose={closeItemForm}
        onSave={handleSaveItem}
        initial={editingItem ? {
          stageId:   editingItem.stageId,
          title:     editingItem.title,
          value:     editingItem.value !== undefined ? String(editingItem.value) : '',
          contactId: editingItem.contactId ?? '',
          clientId:  editingItem.clientId  ?? '',
          notes:     editingItem.notes     ?? '',
        } : undefined}
        defaultStageId={defaultStageId}
        stages={stages}
        contacts={contacts}
        clients={clients}
        isSaving={isSavingItem}
        saveError={saveItemError}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteItem}
        title="Delete Item"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete Item"
        confirmVariant="danger"
      />
    </PageShell>
  );
}

export default PipelineDetailPage;

// --- Pipeline item card ---

interface PipelineItemCardProps {
  item: PipelineItem;
  stages: PipelineStage[];
  canEdit: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddToStage?: (stageId: string) => void;
  hasAutomations?: boolean;
}

function IconBolt() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function PipelineItemCard({ item, canEdit, isAdmin, onEdit, onDelete, hasAutomations }: PipelineItemCardProps) {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-start gap-2">
        <p className="text-sm font-medium text-gray-900 leading-snug flex-1">{item.title}</p>
        {hasAutomations && (
          <div title="This item triggers automations when moved" className="text-amber-500 flex-shrink-0">
            <IconBolt />
          </div>
        )}
      </div>

      {item.value !== undefined && (
        <p className="text-xs font-semibold text-green-700">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(item.value)}
        </p>
      )}

      {(item.contact || item.client) && (
        <div className="flex flex-wrap gap-1">
          {item.contact && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-brand-navy/10 text-brand-navy font-medium">
              {item.contact.firstName} {item.contact.lastName}
            </span>
          )}
          {item.client && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-brand-blue/10 text-brand-blue font-medium">
              {item.client.name}
            </span>
          )}
        </div>
      )}

      {item.notes && (
        <p className="text-xs text-gray-400 line-clamp-2">{item.notes}</p>
      )}

      <div className="flex justify-end gap-1 pt-1">
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="text-xs text-gray-400 hover:text-brand-blue transition-colors px-1"
            title="Edit item"
          >✎</button>
        )}
        {isAdmin && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
            title="Delete item"
          >✕</button>
        )}
      </div>
    </div>
  );
}
