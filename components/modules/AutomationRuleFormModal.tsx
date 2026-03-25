'use client';

// Modal form for creating and editing automation rules.
// Multi-section layout:
//   Section 1: Name, Description, Active toggle
//   Section 2: Trigger type + dynamic config fields
//   Section 3: Conditions (add/remove rows)
//   Section 4: Actions (add/remove rows)
//
// Props:
//   isOpen       — controls visibility
//   onClose      — dismiss callback
//   onSave       — called with submitted rule data
//   initial      — pre-filled values for edit mode
//   isSaving     — disables buttons while request is in flight
//   saveError    — inline error message

import { useState, useEffect } from 'react';
import { useFormState } from '@/lib/hooks/use-form-state';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select, Textarea, Card, Badge } from '@/components/ui';
import type { AutomationRule, AutomationTriggerType, Condition, AutomationActionType } from '@/lib/types/automations';
import { TRIGGER_TYPES, ACTION_TYPES, CONDITION_OPERATORS, CONDITION_FIELDS } from '@/lib/constants/automations';

type RuleFormData = Omit<AutomationRule, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;

interface AutomationRuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RuleFormData) => void;
  initial?: Partial<RuleFormData>;
  isSaving?: boolean;
  saveError?: string | null;
}

const TRIGGER_TYPE_OPTIONS: { value: AutomationTriggerType; label: string }[] = [
  { value: 'pipeline.item_stage_changed', label: 'Pipeline Item Stage Changed' },
  { value: 'task.status_changed', label: 'Task Status Changed' },
  { value: 'task.completed', label: 'Task Completed' },
  { value: 'proposal.status_changed', label: 'Proposal Status Changed' },
  { value: 'sla.stage_time_exceeded', label: 'SLA: Stage Time Exceeded' },
  { value: 'sla.task_overdue', label: 'SLA: Task Overdue' },
  { value: 'schedule.daily', label: 'Daily Schedule' },
];

const ACTION_TYPE_OPTIONS = [
  { value: 'create_task', label: 'Create Task' },
  { value: 'move_to_stage', label: 'Move to Stage' },
  { value: 'update_status', label: 'Update Status' },
  { value: 'assign_user', label: 'Assign User' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'send_email', label: 'Send Email' },
];

const DEFAULTS: RuleFormData = {
  name: '',
  description: undefined,
  isActive: true,
  triggerType: 'pipeline.item_stage_changed',
  triggerConfig: {},
  conditions: [],
  actions: [],
};

export function AutomationRuleFormModal({
  isOpen,
  onClose,
  onSave,
  initial,
  isSaving = false,
  saveError = null,
}: AutomationRuleFormModalProps) {
  const { form, errors, setField, reset } = useFormState(DEFAULTS, initial);
  const [localConditions, setLocalConditions] = useState<Condition[]>(form.conditions);
  const [localActions, setLocalActions] = useState<Array<{ type: AutomationActionType; config: Record<string, unknown> }>>(
    form.actions as Array<{ type: AutomationActionType; config: Record<string, unknown> }>
  );

  useEffect(() => {
    if (isOpen) {
      reset(DEFAULTS, initial);
      setLocalConditions(initial?.conditions ?? []);
      setLocalActions((initial?.actions ?? []) as Array<{ type: AutomationActionType; config: Record<string, unknown> }>);
    }
  }, [isOpen, initial, reset]);

  function handleAddCondition() {
    setLocalConditions([...localConditions, { field: '', operator: 'is', value: '' }]);
  }

  function handleRemoveCondition(idx: number) {
    setLocalConditions(localConditions.filter((_, i) => i !== idx));
  }

  function handleConditionChange(idx: number, key: keyof Condition, val: unknown) {
    const updated = [...localConditions];
    updated[idx] = { ...updated[idx], [key]: val };
    setLocalConditions(updated);
  }

  function handleAddAction() {
    setLocalActions([
      ...localActions,
      { type: 'create_task', config: {} },
    ]);
  }

  function handleRemoveAction(idx: number) {
    setLocalActions(localActions.filter((_, i) => i !== idx));
  }

  function handleActionChange(idx: number, key: string, val: unknown) {
    const updated = [...localActions];
    updated[idx] = { ...updated[idx], [key]: val };
    setLocalActions(updated);
  }

  function handleSave() {
    const payload: RuleFormData = {
      ...form,
      conditions: localConditions,
      actions: localActions,
    };
    onSave(payload);
  }

  const triggerFields = getTriggerConfigFields(form.triggerType);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial?.name ? 'Edit Rule' : 'Create Rule'} size="xl">
      <div className="space-y-6">
        {/* Error banner */}
        {saveError && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {saveError}
          </div>
        )}

        {/* Section 1: Name & Active */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Rule Details</h3>
          <div className="space-y-3">
            <Input
              label="Name"
              placeholder="e.g., Auto-advance stale proposals"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />
            <Textarea
              label="Description (optional)"
              placeholder="Why does this rule exist?"
              value={form.description ?? ''}
              onChange={(e) => setField('description', e.target.value || undefined)}
              rows={2}
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setField('isActive', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
        </Card>

        {/* Section 2: Trigger */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">When</h3>
          <div className="space-y-3">
            <Select
              label="Trigger Event"
              options={TRIGGER_TYPE_OPTIONS}
              value={form.triggerType}
              onChange={(e) => setField('triggerType', e.currentTarget.value as AutomationTriggerType)}
            />

            {/* Trigger config fields (dynamic) */}
            {triggerFields.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                value={(form.triggerConfig?.[field.key] as string) ?? ''}
                onChange={(e) =>
                  setField('triggerConfig', {
                    ...form.triggerConfig,
                    [field.key]: e.target.value,
                  })
                }
              />
            ))}
          </div>
        </Card>

        {/* Section 3: Conditions */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Conditions (Optional)</h3>
            <button
              type="button"
              onClick={handleAddCondition}
              className="text-xs text-brand-blue hover:underline"
            >
              + Add
            </button>
          </div>
          {localConditions.length === 0 ? (
            <p className="text-xs text-gray-400">Rule will fire for all events matching the trigger.</p>
          ) : (
            <div className="space-y-2">
              {localConditions.map((cond, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <Select
                    options={(CONDITION_FIELDS[form.triggerType] ?? []).map((f) => ({
                      value: f,
                      label: f,
                    }))}
                    value={cond.field}
                    onChange={(e) => handleConditionChange(idx, 'field', e.currentTarget.value)}
                  />
                  <Select
                    options={Object.entries(CONDITION_OPERATORS).map(([key, label]) => ({ value: key, label }))}
                    value={cond.operator}
                    onChange={(e) => handleConditionChange(idx, 'operator', e.currentTarget.value as 'is' | 'is_not')}
                  />
                  <Input
                    placeholder="Value"
                    value={cond.value as string}
                    onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(idx)}
                    className="text-xs text-red-600 hover:underline px-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Section 4: Actions */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Then Execute</h3>
            <button
              type="button"
              onClick={handleAddAction}
              className="text-xs text-brand-blue hover:underline"
            >
              + Add
            </button>
          </div>
          {localActions.length === 0 ? (
            <p className="text-xs text-gray-400">Add at least one action.</p>
          ) : (
            <div className="space-y-3">
              {localActions.map((action, idx) => (
                <div key={idx} className="border border-gray-200 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Select
                      options={ACTION_TYPE_OPTIONS as Array<{ value: string; label: string }>}
                      value={action.type}
                      onChange={(e) => handleActionChange(idx, 'type', e.currentTarget.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAction(idx)}
                      className="text-xs text-red-600 hover:underline px-2"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Action-specific config fields */}
                  {renderActionConfig(action.type, action.config, (key, val) => {
                    handleActionChange(idx, 'config', { ...action.config, [key]: val });
                  })}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Action buttons */}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !form.name || localActions.length === 0}>
            {isSaving ? 'Saving...' : 'Save Rule'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---

interface TriggerField {
  key: string;
  label: string;
  placeholder: string;
}

function getTriggerConfigFields(triggerType: AutomationTriggerType): TriggerField[] {
  switch (triggerType) {
    case 'sla.stage_time_exceeded':
      return [
        { key: 'pipelineId', label: 'Pipeline', placeholder: 'Pipeline ID' },
        { key: 'stageId', label: 'Stage', placeholder: 'Stage ID' },
        { key: 'thresholdHours', label: 'Hours in Stage', placeholder: 'e.g., 48' },
      ];
    case 'sla.task_overdue':
      return [
        { key: 'thresholdHours', label: 'Hours Past Due', placeholder: 'e.g., 24' },
      ];
    case 'schedule.daily':
      return [
        { key: 'time', label: 'Time (HH:MM)', placeholder: '09:00' },
        { key: 'timezone', label: 'Timezone', placeholder: 'America/Denver' },
      ];
    default:
      return [];
  }
}

function renderActionConfig(
  actionType: AutomationActionType,
  config: Record<string, unknown>,
  onChange: (key: string, val: unknown) => void,
): React.ReactNode {
  switch (actionType) {
    case 'create_task':
      return (
        <>
          <Input
            label="Task Title"
            placeholder="e.g., {{item.title}}"
            value={(config.title as string) ?? ''}
            onChange={(e) => onChange('title', e.target.value)}
          />
          <Input
            label="Description"
            placeholder="Optional"
            value={(config.description as string) ?? ''}
            onChange={(e) => onChange('description', e.target.value)}
          />
        </>
      );
    case 'move_to_stage':
      return (
        <Input
          label="Target Stage ID"
          placeholder="Stage ID"
          value={(config.stageId as string) ?? ''}
          onChange={(e) => onChange('stageId', e.target.value)}
        />
      );
    case 'update_status':
      return (
        <Input
          label="Status"
          placeholder="e.g., done"
          value={(config.status as string) ?? ''}
          onChange={(e) => onChange('status', e.target.value)}
        />
      );
    case 'assign_user':
      return (
        <Input
          label="User ID"
          placeholder="User ID"
          value={(config.userId as string) ?? ''}
          onChange={(e) => onChange('userId', e.target.value)}
        />
      );
    case 'send_notification':
    case 'send_email':
      return (
        <>
          <Input
            label={actionType === 'send_email' ? 'Subject' : 'Message'}
            placeholder="e.g., Task complete!"
            value={(config.message as string) ?? ''}
            onChange={(e) => onChange('message', e.target.value)}
          />
          <Input
            label="Recipient ID"
            placeholder="User ID"
            value={(config.recipientId as string) ?? ''}
            onChange={(e) => onChange('recipientId', e.target.value)}
          />
        </>
      );
    default:
      return null;
  }
}
