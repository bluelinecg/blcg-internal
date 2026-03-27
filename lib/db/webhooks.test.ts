// Unit tests for lib/db/webhooks.ts
// Supabase serverClient is mocked — no real DB connection needed.

import {
  listWebhookEndpoints,
  listActiveEndpointsForEvent,
  createWebhookEndpoint,
  getWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  listWebhookDeliveries,
  createWebhookDelivery,
} from './webhooks';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

function makeChain(result: { data: unknown; count?: number | null; error: unknown }) {
  const chain = {
    select:   jest.fn().mockReturnThis(),
    insert:   jest.fn().mockReturnThis(),
    update:   jest.fn().mockReturnThis(),
    delete:   jest.fn().mockReturnThis(),
    order:    jest.fn().mockReturnThis(),
    limit:    jest.fn().mockReturnThis(),
    eq:       jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    single:   jest.fn().mockResolvedValue(result),
    then:     jest.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result))),
  };
  return chain;
}

jest.mock('@/lib/db/supabase', () => ({ serverClient: jest.fn() }));
import { serverClient } from '@/lib/db/supabase';
const mockServerClient = serverClient as jest.Mock;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const ENDPOINT_ROW = {
  id:          'ep-1',
  url:         'https://example.com/webhook',
  description: 'Test endpoint',
  secret:      'abc123',
  events:      ['contact.created', 'task.created'],
  is_active:   true,
  created_at:  '2026-01-01T00:00:00Z',
  updated_at:  '2026-01-01T00:00:00Z',
};

const DELIVERY_ROW = {
  id:             'del-1',
  endpoint_id:    'ep-1',
  event_type:     'contact.created',
  payload:        { event: 'contact.created', timestamp: '2026-01-01T00:00:00Z', data: {} },
  status:         'success',
  http_status:    200,
  response_body:  'OK',
  attempt_number: 1,
  attempted_at:   '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// listWebhookEndpoints
// ---------------------------------------------------------------------------

describe('listWebhookEndpoints', () => {
  it('returns mapped endpoints on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [ENDPOINT_ROW], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await listWebhookEndpoints();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data![0]).toMatchObject({
      id:       'ep-1',
      url:      'https://example.com/webhook',
      isActive: true,
      events:   ['contact.created', 'task.created'],
    });
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'DB error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await listWebhookEndpoints();
    expect(result.error).toBe('DB error');
    expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listActiveEndpointsForEvent
// ---------------------------------------------------------------------------

describe('listActiveEndpointsForEvent', () => {
  it('returns endpoints subscribed to the event', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [ENDPOINT_ROW], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await listActiveEndpointsForEvent('contact.created');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(chain.eq).toHaveBeenCalledWith('is_active', true);
    expect(chain.contains).toHaveBeenCalledWith('events', ['contact.created']);
  });

  it('returns empty array when no endpoints match', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await listActiveEndpointsForEvent('task.status_changed');
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createWebhookEndpoint
// ---------------------------------------------------------------------------

describe('createWebhookEndpoint', () => {
  it('returns the created endpoint on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: ENDPOINT_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await createWebhookEndpoint(
      { url: 'https://example.com/webhook', description: 'Test endpoint', events: ['contact.created', 'task.created'] },
      'abc123',
    );

    expect(result.error).toBeNull();
    expect(result.data?.url).toBe('https://example.com/webhook');
    expect(result.data?.secret).toBe('abc123');
  });

  it('returns error on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'insert failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await createWebhookEndpoint(
      { url: 'https://example.com/webhook', events: ['contact.created'], description: undefined },
      'secret',
    );
    expect(result.error).toBe('insert failed');
    expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteWebhookEndpoint
// ---------------------------------------------------------------------------

describe('deleteWebhookEndpoint', () => {
  it('returns no error on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await deleteWebhookEndpoint('ep-1');
    expect(result.error).toBeNull();
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'delete failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await deleteWebhookEndpoint('ep-1');
    expect(result.error).toBe('delete failed');
  });
});

// ---------------------------------------------------------------------------
// getWebhookEndpoint
// ---------------------------------------------------------------------------

describe('getWebhookEndpoint', () => {
  it('returns the endpoint on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: ENDPOINT_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await getWebhookEndpoint('ep-1');

    expect(result.error).toBeNull();
    expect(result.data?.id).toBe('ep-1');
    expect(chain.eq).toHaveBeenCalledWith('id', 'ep-1');
  });

  it('returns null data (not found) when PGRST116 is returned', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'no rows' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await getWebhookEndpoint('missing');
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error string on other DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: '42P01', message: 'table missing' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await getWebhookEndpoint('ep-1');
    expect(result.error).toBe('table missing');
    expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateWebhookEndpoint
// ---------------------------------------------------------------------------

describe('updateWebhookEndpoint', () => {
  it('returns the updated endpoint on success', async () => {
    const updated = { ...ENDPOINT_ROW, is_active: false };
    const db = { from: jest.fn() };
    const chain = makeChain({ data: updated, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await updateWebhookEndpoint('ep-1', { isActive: false });

    expect(result.error).toBeNull();
    expect(result.data?.isActive).toBe(false);
  });

  it('returns null data (not found) when PGRST116 is returned', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'no rows' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await updateWebhookEndpoint('missing', { isActive: true });
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: '23505', message: 'update failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await updateWebhookEndpoint('ep-1', { url: 'https://new.example.com' });
    expect(result.error).toBe('update failed');
    expect(result.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listWebhookDeliveries
// ---------------------------------------------------------------------------

describe('listWebhookDeliveries', () => {
  it('returns mapped deliveries on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [DELIVERY_ROW], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await listWebhookDeliveries('ep-1');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data![0]).toMatchObject({
      id:         'del-1',
      endpointId: 'ep-1',
      eventType:  'contact.created',
      status:     'success',
      httpStatus: 200,
    });
  });

  it('returns error on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'query failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const result = await listWebhookDeliveries('ep-1');
    expect(result.error).toBe('query failed');
  });
});

// ---------------------------------------------------------------------------
// createWebhookDelivery
// ---------------------------------------------------------------------------

describe('createWebhookDelivery', () => {
  it('returns the new delivery id on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: { id: 'del-2' }, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const payload = { event: 'contact.created' as const, timestamp: '2026-01-01T00:00:00Z', data: {} };
    const result  = await createWebhookDelivery('ep-1', 'contact.created', payload, 'success', 200, 'OK');

    expect(result.error).toBeNull();
    expect(result.id).toBe('del-2');
  });

  it('returns error on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'insert failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const payload = { event: 'contact.created' as const, timestamp: '2026-01-01T00:00:00Z', data: {} };
    const result  = await createWebhookDelivery('ep-1', 'contact.created', payload, 'failed', null, null);

    expect(result.error).toBe('insert failed');
    expect(result.id).toBeNull();
  });
});
