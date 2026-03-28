// Event Bus handler: automation engine.
// Maps EventName → AutomationTriggerType and runs matching active rules.
// Events with no trigger mapping are silently skipped.

import { runAutomations } from '@/lib/automations/engine';
import type { AutomationTriggerType } from '@/lib/types/automations';
import type { EventHandler, EventName } from '../types';

const AUTOMATION_TRIGGER_MAP: Partial<Record<EventName, AutomationTriggerType>> = {
  'pipeline.item_stage_changed': 'pipeline.item_stage_changed',
  'task.status_changed':         'task.status_changed',
  'task.completed':              'task.completed',
  'proposal.created':            'proposal.created',
  'proposal.status_changed':     'proposal.status_changed',
  'invoice.status_changed':      'invoice.status_changed',
};

export const automationsHandler: EventHandler = async (eventName, payload) => {
  const triggerType = AUTOMATION_TRIGGER_MAP[eventName];
  if (!triggerType) return;

  await runAutomations(triggerType, payload.data);
};
