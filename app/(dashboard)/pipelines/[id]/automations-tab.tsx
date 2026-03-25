'use client';

// Automations tab for pipeline detail page.
// Shows all automation rules with trigger type `pipeline.item_stage_changed` for this pipeline.
// Uses ExpandableTable to display rules with conditions and actions visible on expand.

import { useState, useEffect } from 'react';
import { ExpandableTable, Spinner, Badge } from '@/components/ui';
import type { TableColumn } from '@/components/ui/ExpandableTable';
import type { AutomationRule } from '@/lib/types/automations';
import { TRIGGER_TYPES } from '@/lib/constants/automations';

interface PipelineAutomationsTabProps {
  pipelineId: string;
  onRulesChange: (rules: AutomationRule[]) => void;
}

export function PipelineAutomationsTab({ pipelineId, onRulesChange }: PipelineAutomationsTabProps) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadRules();
  }, [pipelineId]);

  async function loadRules() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/automations');
      if (!res.ok) throw new Error('Failed to load automations');
      const { data, error: apiError } = await res.json() as { data: AutomationRule[] | null; error: string | null };
      if (apiError) throw new Error(apiError);

      // Filter for pipeline.item_stage_changed trigger and active rules
      const filtered = (data ?? []).filter(
        (rule) => rule.triggerType === 'pipeline.item_stage_changed' && rule.isActive
      );
      setRules(filtered);
      onRulesChange(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automations');
    } finally {
      setIsLoading(false);
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
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle automation');
    }
  }

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="rounded bg-red-50 p-4 text-red-700">
        Error: {error}
      </div>
    );
  }

  const columns: Array<TableColumn<AutomationRule>> = [
    {
      key: 'name',
      header: 'Rule',
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
      key: 'trigger',
      header: 'Trigger',
      render: (rule) => <Badge variant="blue">{TRIGGER_TYPES[rule.triggerType]}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (rule) => <Badge variant="gray">{rule.actions.length}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (rule) => (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rule.isActive}
            onChange={() => handleToggleActive(rule.id, rule.isActive)}
            className="w-4 h-4"
          />
          <span className="text-xs text-gray-600">{rule.isActive ? 'Active' : 'Inactive'}</span>
        </label>
      ),
    },
  ];

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 rounded bg-gray-50 border border-gray-100 p-6">
        <p className="text-sm text-gray-500 mb-2">No active automations for this pipeline.</p>
        <p className="text-xs text-gray-400">Create automation rules on the Automations page to trigger workflows when items move stages.</p>
      </div>
    );
  }

  return (
    <ExpandableTable<AutomationRule>
      columns={columns}
      rows={rules}
      getRowId={(r) => r.id}
      renderExpanded={(rule) => <RuleDetails rule={rule} />}
      emptyMessage="No automations found."
    />
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
            <p className="text-gray-500">None (fires for all stage changes)</p>
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
