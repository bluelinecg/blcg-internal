/**
 * Supabase mock builder for unit tests.
 *
 * Creates a chainable mock of the Supabase query builder so tests can stub
 * the return values of serverClient() without hitting a real database.
 *
 * Usage in a test file:
 *
 *   import { makeSupabaseMock } from '@/tests/helpers/supabase';
 *
 *   jest.mock('@/lib/db/supabase', () => ({
 *     serverClient: jest.fn(),
 *   }));
 *
 *   import { serverClient } from '@/lib/db/supabase';
 *
 *   const mockClient = makeSupabaseMock({ data: [createMockClient()], error: null });
 *   jest.mocked(serverClient).mockReturnValue(mockClient);
 *
 * The builder stubs the full fluent chain:
 *   .from() .select() .insert() .update() .delete() .upsert()
 *   .eq() .neq() .in() .order() .range() .single() .limit()
 *
 * Each terminal method (.single(), .select() when chained last, etc.)
 * resolves with the provided { data, error, count } values.
 *
 * Extractable as-is to any project using @supabase/supabase-js.
 */

interface MockResult<T = unknown> {
  data: T;
  error: null | { message: string; code?: string };
  count?: number | null;
}

// Builds a proxy where every method returns `this`, and every terminal
// call resolves to the configured result.
function buildChain<T>(result: MockResult<T>): Record<string, jest.Mock> {
  const resolved = Promise.resolve(result);

  const chain: Record<string, jest.Mock> = {};

  const chainMethods = [
    'from', 'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'not', 'is', 'gt', 'gte', 'lt', 'lte',
    'order', 'range', 'limit', 'single', 'maybeSingle', 'filter',
    'match', 'contains', 'overlaps', 'textSearch', 'or', 'and',
  ];

  for (const method of chainMethods) {
    chain[method] = jest.fn().mockReturnValue({ ...chain, then: resolved.then.bind(resolved) });
  }

  // Make the chain itself thenable so `await client.from(...).select(...)` works
  (chain as Record<string, unknown>).then = resolved.then.bind(resolved);

  return chain;
}

export function makeSupabaseMock<T = unknown>(result: MockResult<T>) {
  const chain = buildChain(result);
  return chain as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;
}
