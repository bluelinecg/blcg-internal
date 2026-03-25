// Unit tests for lib/automations/conditions.ts
// Pure function — no mocks needed.

import { evaluateConditions } from './conditions';
import type { Condition } from '@/lib/types/automations';

describe('evaluateConditions', () => {
  it('returns true when conditions array is empty', () => {
    expect(evaluateConditions([], { status: 'done' })).toBe(true);
  });

  it('returns true when all conditions pass (is)', () => {
    const conditions: Condition[] = [
      { field: 'status', operator: 'is', value: 'done' },
    ];
    expect(evaluateConditions(conditions, { status: 'done' })).toBe(true);
  });

  it('returns false when an "is" condition does not match', () => {
    const conditions: Condition[] = [
      { field: 'status', operator: 'is', value: 'done' },
    ];
    expect(evaluateConditions(conditions, { status: 'in_progress' })).toBe(false);
  });

  it('returns true when "is_not" condition passes', () => {
    const conditions: Condition[] = [
      { field: 'priority', operator: 'is_not', value: 'low' },
    ];
    expect(evaluateConditions(conditions, { priority: 'high' })).toBe(true);
  });

  it('returns false when "is_not" condition does not pass (value matches)', () => {
    const conditions: Condition[] = [
      { field: 'priority', operator: 'is_not', value: 'low' },
    ];
    expect(evaluateConditions(conditions, { priority: 'low' })).toBe(false);
  });

  it('uses AND logic — all conditions must pass', () => {
    const conditions: Condition[] = [
      { field: 'status',   operator: 'is',     value: 'done' },
      { field: 'priority', operator: 'is_not', value: 'low' },
    ];
    expect(evaluateConditions(conditions, { status: 'done', priority: 'high' })).toBe(true);
    expect(evaluateConditions(conditions, { status: 'done', priority: 'low'  })).toBe(false);
    expect(evaluateConditions(conditions, { status: 'todo', priority: 'high' })).toBe(false);
  });

  it('treats missing field as empty string — does not match non-empty condition value', () => {
    const conditions: Condition[] = [
      { field: 'assignee', operator: 'is', value: 'Ryan' },
    ];
    expect(evaluateConditions(conditions, {})).toBe(false);
  });

  it('matches missing field against empty string condition value', () => {
    const conditions: Condition[] = [
      { field: 'assignee', operator: 'is', value: '' },
    ];
    expect(evaluateConditions(conditions, {})).toBe(true);
  });

  it('coerces non-string field values to string for comparison', () => {
    const conditions: Condition[] = [
      { field: 'count', operator: 'is', value: '5' },
    ];
    expect(evaluateConditions(conditions, { count: 5 })).toBe(true);
  });
});
