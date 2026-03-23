/**
 * Parses and validates URL search params into a ListOptions object.
 * Used by all list API routes to avoid duplicating query param parsing logic.
 *
 * @example
 * // In an API route:
 * const params = parseListParams(new URL(request.url).searchParams);
 * const { data, total, error } = await listClients(params);
 */

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants/pagination';
import type { ListOptions } from '@/lib/types/pagination';

export function parseListParams(searchParams: URLSearchParams): ListOptions {
  const rawPage     = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');
  const rawSort     = searchParams.get('sort');
  const rawOrder    = searchParams.get('order');

  const page     = rawPage     ? Math.max(1, parseInt(rawPage, 10))                                    : 1;
  const pageSize = rawPageSize ? Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(rawPageSize, 10)))        : DEFAULT_PAGE_SIZE;
  const order    = rawOrder === 'desc' ? 'desc' : 'asc';

  return {
    page,
    pageSize,
    sort:  rawSort ?? undefined,
    order,
  };
}
