// Unit tests for lib/db/audit-log.ts
// Supabase serverClient is mocked — no real DB connection needed.

import { insertLog, listLogs, listLogsForEntity } from './audit-log';
import type { InsertLogInput } from './audit-log';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

function makeChain(result: { data: unknown; count?: number | null; error: unknown }) {
  const chain = {
    select:  jest.fn().mockReturnThis(),
    insert:  jest.fn().mockReturnThis(),
    order:   jest.fn().mockReturnThis(),
    range:   jest.fn().mockReturnThis(),
    eq:      jest.fn().mockReturnThis(),
    single:  jest.fn().mockResolvedValue(result),
    then:    jest.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result))),
  };
  return chain;
}

jest.mock('@/lib/db/supabase', () => ({ serverClient: jest.fn() }));
import { serverClient } from '@/lib/db/supabase';
const mockServerClient = serverClient as jest.Mock;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const LOG_ROW = {
  id:           'log-1',
  entity_type:  'client',
  entity_id:    'client-1',
  entity_label: 'Acme Corp',
  action:       'created',
  actor_id:     'user_abc',
  actor_name:   'Ryan Matthews',
  metadata:     null,
  created_at:   '2026-01-01T00:00:00Z',
};

const INSERT_INPUT: InsertLogInput = {
  entityType:  'client',
  entityId:    'client-1',
  entityLabel: 'Acme Corp',
  action:      'created',
  actorId:     'user_abc',
  actorName:   'Ryan Matthews',
};

// ---------------------------------------------------------------------------
// insertLog
// ---------------------------------------------------------------------------

describe('insertLog', () => {
  it('returns { error: null } on success', async () => {
    const chain = makeChain({ data: null, error: null });
    const db = { from: jest.fn().mockReturnValue(chain) };
    mockServerClient.mockReturnValue(db);

    const result = await insertLog(INSERT_INPUT);
    expect(result).toEqual({ error: null });
    expect(db.from).toHaveBeenCalledWith('audit_log');
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type:  'client',
        entity_id:    'client-1',
        entity_label: 'Acme Corp',
        action:       'created',
        actor_id:     'user_abc',
        actor_name:   'Ryan Matthews',
        metadata:     null,
      }),
    );
  });

  it('returns { error } when Supabase returns an error', async () => {
    const chain = makeChain({ data: null, error: { message: 'insert failed' } });
    const db = { from: jest.fn().mockReturnValue(chain) };
    mockServerClient.mockReturnValue(db);

    const result = await insertLog(INSERT_INPUT);
    expect(result.error).toBe('insert failed');
  });

  it('includes metadata in the insert when provided', async () => {
    const chain = makeChain({ data: null, error: null });
    const db = { from: jest.fn().mockReturnValue(chain) };
    mockServerClient.mockReturnValue(db);

    await insertLog({ ...INSERT_INPUT, metadata: { from: 'draft', to: 'sent' } });
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { from: 'draft', to: 'sent' } }),
    );
  });
});

// ---------------------------------------------------------------------------
// listLogs
// ---------------------------------------------------------------------------

describe('listLogs', () => {
  it('returns mapped entries on success', async () => {
    const chain = makeChain({ data: [LOG_ROW], count: 1, error: null });
    const db = { from: jest.fn().mockReturnValue(chain) };
    mockServerClient.mockReturnValue(db);

    const result = await listLogs({ page: 1, pageSize: 25 });
    expect(result.error).toBeNull();
    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]).toMatchObject({
      id:          'log-1',
      entityType:  'client',
      entityId:    'client-1',
      entityLabel: 'Acme Corp',
      action:      'created',
      actorId:     'user_abc',
      actorName:   'Ryan Matthews',
      createdAt:   '2026-01-01T00:00:00Z',
    });
  });

  it('returns error string when Supabase returns an error', async () => {
    const chain = makeChain({ data: null, count: null, error: { message: 'query failed' } });
    const db = { from: jest.fn().mockReturnValue(chain) };
    mockServerClient.mockReturnValue(db);

    const result = await listLogs();
    expect(result.data).toBeNull();
    expect(result.error).toBe('query failed');
  });
});

// ---------------------------------------------------------------------------
// listLogsForEntity
// ---------------------------------------------------------------------------

describe('listLogsForEntity', () => {
  it('filters by entity_type and entity_id', async () => {
    const chain = makeChain({ data: [LOG_ROW], count: 1, error: null });
    const db = { from: jest.fn().mockReturnValue(chain) };
    mockServerClient.mockReturnValue(db);

    const result = await listLogsForEntity('client', 'client-1');
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(chain.eq).toHaveBeenCalledWith('entity_type', 'client');
    expect(chain.eq).toHaveBeenCalledWith('entity_id', 'client-1');
  });

  it('returns error string when Supabase returns an error', async () => {
    const chain = makeChain({ data: null, count: null, error: { message: 'not found' } });
    const db = { from: jest.fn().mockReturnValue(chain) };
    mockServerClient.mockReturnValue(db);

    const result = await listLogsForEntity('client', 'client-1');
    expect(result.data).toBeNull();
    expect(result.error).toBe('not found');
  });

  it('returns empty array when no entries exist for entity', async () => {
    const chain = makeChain({ data: [], count: 0, error: null });
    const db = { from: jest.fn().mockReturnValue(chain) };
    mockServerClient.mockReturnValue(db);

    const result = await listLogsForEntity('contact', 'contact-999');
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});
