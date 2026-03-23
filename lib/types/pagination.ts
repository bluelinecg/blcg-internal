/**
 * Shared types for paginated list queries.
 * Used across the DB layer, API routes, and the useListState hook.
 */

/** Options accepted by all list query functions. All fields are optional. */
export interface ListOptions {
  /** 1-indexed page number. Must be paired with pageSize. */
  page?: number;
  /** Records per page. Must be paired with page. */
  pageSize?: number;
  /** DB column name to sort by. Each module validates against its allowed columns. */
  sort?: string;
  /** Sort direction. Defaults to 'asc'. */
  order?: 'asc' | 'desc';
}

/** Return type for paginated list queries from the DB layer. */
export interface PaginatedResult<T> {
  data: T[] | null;
  /** Total record count (before pagination). Null on error. */
  total: number | null;
  error: string | null;
}

/** API response shape for paginated list endpoints. */
export interface PaginatedApiResponse<T> {
  data: T[] | null;
  /** Total record count across all pages. Null on error. */
  total: number | null;
  error: string | null;
}
