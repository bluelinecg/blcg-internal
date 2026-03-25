'use client';

// Client wrapper for automations page — handles state, form modal, and API calls.

import { useState } from 'react';
import { Card, Button, Badge, ConfirmDialog, ExpandableTable, Spinner } from '@/components/ui';
import type { TableColumn } from '@/components/ui/ExpandableTable';
import { AutomationRuleFormModal } from '@/components/modules/AutomationRuleFormModal';
import type { AutomationRule } from '@/lib/types/automations';
import { TRIGGER_TYPES } from '@/lib/constants/automations';

interface AutomationsPageClientProps {
  initialRules: AutomationRule[];
}

export function AutomationsPageClient({ initialRules }: AutomationsPageClientProps) {
  const [rules, setRules] = useState(initialRules);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ ruleId: string; ruleName: string } | null>(null);

  async function handleSave(data: Omit<AutomationRule, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) {
    setIsSaving(true);
    setSaveError(null);

    try {
      const method = editingRule ? 'PATCH' : 'POST';
      const endpoint = editingRule ? `/api/automations/${editingRule.id}` : '/api/automations';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? 'Failed to save rule');
      }

      const { data: savedRule } = await res.json();

      if (editingRule) {
        setRules((prev) =>
          prev.map((r) => (r.id === savedRule.id ? savedRule : r)),
        );
      } else {
        setRules((prev) => [...prev, savedRule]);
      }

      setIsFormOpen(false);
      setEditingRule(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(ruleId: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/automations/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (!res.ok) throw new Error('Failed to toggle');

      const { data: updated } = await res.json();
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? updated : r)),
      );
    } catch (err) {
      console.error('Failed to toggle active:', err);
    }
  }

  async function handleDelete(ruleId: string) {
    try {
      const res = await fetch(`/api/automations/${ruleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }

  function handleOpenNew() {
    setEditingRule(null);
    setSaveError(null);
    setIsFormOpen(true);
  }

  function handleOpenEdit(rule: AutomationRule) {
    setEditingRule(rule);
    setSaveError(null);
    setIsFormOpen(true);
  }

  function handleCloseForm() {
    setIsFormOpen(false);
    setEditingRule(null);
    setSaveError(null);
  }

  const columns: Array<TableColumn<AutomationRule>> = [
    {
      key: 'name',
      header: 'Name',
      render: (rule) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{rule.name}</p>
          {rule.description && (
            <p className="text-xs text-gray-500">{rule.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'triggerType',
      header: 'Trigger',
      render: (rule) => (
        <Badge variant="blue">{TRIGGER_TYPES[rule.triggerType] || rule.triggerType}</Badge>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (rule) => (
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={rule.isActive}
            onChange={() => handleToggleActive(rule.id, rule.isActive)}
            className="w-4 h-4"
          />
          <span className="ml-1 text-xs text-gray-600">{rule.isActive ? 'Active' : 'Inactive'}</span>
        </label>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (rule) => (
        <Badge variant="gray">{rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}</Badge>
      ),
    },
    {
      key: 'controls',
      header: '',
      align: 'right',
      render: (rule) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenEdit(rule)}
            className="text-xs text-brand-blue hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => setConfirmDelete({ ruleId: rule.id, ruleName: rule.name })}
            className="text-xs text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Header with New Rule button */}
      <div className="mb-6 flex items-center justify-between">
        <Button onClick={handleOpenNew}>+ New Rule</Button>
      </div>

      {/* Rules table */}
      {rules.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 mb-3">No automation rules yet.</p>
          <p className="text-sm text-gray-400 mb-6">Create rules to automate workflows for pipelines, tasks, and proposals.</p>
          <Button onClick={handleOpenNew}>Create First Rule</Button>
        </Card>
      ) : (
        <Card>
          <ExpandableTable<AutomationRule>
            columns={columns}
            rows={rules}
            getRowId={(r) => r.id}
            renderExpanded={(rule) => <RuleDetails rule={rule} />}
            emptyMessage="No rules found."
          />
        </Card>
      )}

      {/* Form Modal */}
      <AutomationRuleFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        initial={
          editingRule
            ? {
                name: editingRule.name,
                description: editingRule.description,
                isActive: editingRule.isActive,
                triggerType: editingRule.triggerType,
                triggerConfig: editingRule.triggerConfig,
                conditions: editingRule.conditions,
                actions: editingRule.actions,
              }
            : undefined
        }
        isSaving={isSaving}
        saveError={saveError}
      />

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete.ruleId)}
          title="Delete Rule?"
          description={`Are you sure you want to delete "${confirmDelete.ruleName}"? This cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="danger"
        />
      )}
    </>
  );
}

// --- Rule Details Panel ---

function RuleDetails({ rule }: { rule: AutomationRule }) {
  return (
    <div className="p-4 bg-gray-50 border-t border-gray-100">
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="font-semibold text-gray-700 mb-1">Conditions</p>
          {rule.conditions.length === 0 ? (
            <p className="text-gray-500">None (fires for all events)</p>
          ) : (
            <ul className="space-y-1 text-gray-600">
              {rule.conditions.map((cond, idx) => (
                <li key={idx}>
                  {cond.field} {cond.operator} "{cond.value}"
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-700 mb-1">Actions</p>
          <ul className="space-y-1 text-gray-600">
            {rule.actions.map((action, idx) => (
              <li key={idx}>{action.type}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-3">
        Created {new Date(rule.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
