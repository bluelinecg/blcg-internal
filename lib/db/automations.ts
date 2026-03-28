// Database query functions for the Automation Engine.
// All functions use serverClient() (service role, bypasses RLS).
// Call only from server-side code — API routes and the engine itself.

import { serverClient } from '@/lib/db/supabase';
import type { AutomationRule, AutomationRunLog, AutomationTriggerType, AutomationRunStatus, ActionResult, Condition, AutomationAction } from '@/lib/types/automations';
import type { AutomationRuleInput, UpdateAutomationRuleInput } from '@/lib/validations/automations';

// ---------------------------------------------------------------------------
// Row types (mirror DB columns)
// ---------------------------------------------------------------------------

interface AutomationRuleRow {
  id:             string;
  name:           string;
  description:    string | null;
  is_active:      boolean;
  trigger_type:   string;
  trigger_config: Record<string, unknown>;
  conditions:     Condition[];
  actions:        AutomationAction[];
  created_by:     string;
  created_at:     string;
  updated_at:     string;
}

interface AutomationRunLogRow {
  id:               string;
  rule_id:          string;
  trigger_type:     string;
  entity_id:        string;
  trigger_data:     Record<string, unknown>;
  status:           string;
  error_message:    string | null;
  actions_executed: ActionResult[];
  executed_at:      string;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function ruleFromRow(row: AutomationRuleRow): AutomationRule {
  return {
    id:            row.id,
    name:          row.name,
    description:   row.description ?? undefined,
    isActive:      row.is_active,
    triggerType:   row.trigger_type as AutomationTriggerType,
    triggerConfig: row.trigger_config,
    conditions:    row.conditions ?? [],
    actions:       row.actions ?? [],
    createdBy:     row.created_by,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  };
}

function runLogFromRow(row: AutomationRunLogRow): AutomationRunLog {
  return {
    id:              row.id,
    ruleId:          row.rule_id,
    triggerType:     row.trigger_type as AutomationTriggerType,
    entityId:        row.entity_id,
    triggerData:     row.trigger_data,
    status:          row.status as AutomationRunStatus,
    errorMessage:    row.error_message ?? undefined,
    actionsExecuted: row.actions_executed ?? [],
    executedAt:      row.executed_at,
  };
}

// ---------------------------------------------------------------------------
// Automation Rules
// ---------------------------------------------------------------------------

/** Returns all automation rules ordered by name. */
export async function listAutomationRules(): Promise<{ data: AutomationRule[] | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('automation_rules')
      .select('*')
      .order('name', { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data as AutomationRuleRow[]).map(ruleFromRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Returns a single automation rule by ID. */
export async function getAutomationRuleById(id: string): Promise<{ data: AutomationRule | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('automation_rules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: ruleFromRow(data as AutomationRuleRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Returns all active rules for a given trigger type. Used by the engine dispatcher. */
export async function listActiveRulesByTrigger(triggerType: AutomationTriggerType): Promise<{ data: AutomationRule[] | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('automation_rules')
      .select('*')
      .eq('trigger_type', triggerType)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data as AutomationRuleRow[]).map(ruleFromRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Inserts a new automation rule. */
export async function createAutomationRule(
  input: AutomationRuleInput,
  createdBy: string,
): Promise<{ data: AutomationRule | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('automation_rules')
      .insert({
        name:           input.name,
        description:    input.description ?? null,
        is_active:      input.isActive ?? true,
        trigger_type:   input.triggerType,
        trigger_config: input.triggerConfig ?? {},
        conditions:     input.conditions ?? [],
        actions:        input.actions,
        created_by:     createdBy,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: ruleFromRow(data as AutomationRuleRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Updates an existing automation rule (partial update). */
export async function updateAutomationRule(
  id: string,
  input: UpdateAutomationRuleInput,
): Promise<{ data: AutomationRule | null; error: string | null }> {
  try {
    const patch: Partial<AutomationRuleRow> = {};
    if (input.name          !== undefined) patch.name           = input.name;
    if (input.description   !== undefined) patch.description    = input.description ?? null;
    if (input.isActive      !== undefined) patch.is_active      = input.isActive;
    if (input.triggerType   !== undefined) patch.trigger_type   = input.triggerType;
    if (input.triggerConfig !== undefined) patch.trigger_config = input.triggerConfig;
    if (input.conditions    !== undefined) patch.conditions     = input.conditions;
    if (input.actions       !== undefined) patch.actions        = input.actions;

    const { data, error } = await serverClient()
      .from('automation_rules')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: ruleFromRow(data as AutomationRuleRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Deletes an automation rule. Run log entries cascade-delete via FK. */
export async function deleteAutomationRule(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient()
      .from('automation_rules')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Run Log
// ---------------------------------------------------------------------------

export interface InsertRunLogEntry {
  ruleId:          string;
  triggerType:     AutomationTriggerType;
  entityId:        string;
  triggerData:     Record<string, unknown>;
  status:          AutomationRunStatus;
  errorMessage?:   string;
  actionsExecuted: ActionResult[];
}

/** Writes one execution record. Called by the engine after each rule evaluation. */
export async function insertRunLog(entry: InsertRunLogEntry): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient()
      .from('automation_run_log')
      .insert({
        rule_id:          entry.ruleId,
        trigger_type:     entry.triggerType,
        entity_id:        entry.entityId,
        trigger_data:     entry.triggerData,
        status:           entry.status,
        error_message:    entry.errorMessage ?? null,
        actions_executed: entry.actionsExecuted,
      });

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Returns the last N runs for a rule (used by the run history UI). */
export async function getRunsForRule(
  ruleId: string,
  limit = 20,
): Promise<{ data: AutomationRunLog[] | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('automation_run_log')
      .select('*')
      .eq('rule_id', ruleId)
      .order('executed_at', { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    return { data: (data as AutomationRunLogRow[]).map(runLogFromRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// SLA / Scheduled automation entity fetchers
// ---------------------------------------------------------------------------

export interface StageCandidateRow {
  id:               string;
  stage_id:         string;
  pipeline_id:      string;
  entered_stage_at: string;
  title:            string;
}

export interface TaskCandidateRow {
  id:          string;
  due_date:    string | null;
  priority:    string;
  assignee_id: string | null;
}

/**
 * Returns pipeline items in a specific stage that have been there longer than
 * thresholdHours. Used by the SLA cron to find stage-time-exceeded candidates.
 */
export async function fetchStageItemsForRule(
  pipelineId: string,
  stageId: string,
  thresholdHours: number,
): Promise<StageCandidateRow[]> {
  const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();

  try {
    const { data, error } = await serverClient()
      .from('pipeline_items')
      .select('id, stage_id, pipeline_id, entered_stage_at, title')
      .eq('pipeline_id', pipelineId)
      .eq('stage_id', stageId)
      .lt('entered_stage_at', cutoff);

    if (error || !data) return [];
    return data as StageCandidateRow[];
  } catch {
    return [];
  }
}

/**
 * Returns tasks that are past their due date by at least thresholdHours and
 * are not done. Optionally filtered by priority. Used by the SLA cron.
 */
export async function fetchOverdueTasksForRule(
  thresholdHours: number,
  priority?: string,
): Promise<TaskCandidateRow[]> {
  const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();

  try {
    let query = serverClient()
      .from('tasks')
      .select('id, due_date, priority, assignee_id')
      .not('due_date', 'is', null)
      .lt('due_date', cutoff)
      .neq('status', 'done');

    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data as TaskCandidateRow[];
  } catch {
    return [];
  }
}

/**
 * Returns the most recent run log entry for a (rule, entity) pair.
 * Used by the SLA dedup logic — check if this rule already fired for this entity.
 */
export async function getLastRunForEntity(
  ruleId: string,
  entityId: string,
): Promise<{ data: AutomationRunLog | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('automation_run_log')
      .select('*')
      .eq('rule_id', ruleId)
      .eq('entity_id', entityId)
      .eq('status', 'success')
      .order('executed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: null };
    return { data: runLogFromRow(data as AutomationRunLogRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
