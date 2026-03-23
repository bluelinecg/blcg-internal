'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import type { PaginatedApiResponse } from '@/lib/types/pagination';

interface UseListStateOptions {
  /** API endpoint to fetch from, e.g. '/api/clients' */
  endpoint: string;
  /** Column to sort by on initial load */
  defaultSort: string;
  /** Sort direction on initial load — defaults to 'asc' */
  defaultOrder?: 'asc' | 'desc';
  /** Page size — defaults to DEFAULT_PAGE_SIZE */
  pageSize?: number;
}

interface UseListStateReturn<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalRecords: number;
  sort: string;
  order: 'asc' | 'desc';
  /** Navigate to a specific page number */
  setPage: (page: number) => void;
  /** Set sort column; if the same column is passed, toggles asc/desc */
  setSort: (column: string) => void;
  /** Re-fetch the current page (use after create/update/delete) */
  reload: () => void;
}

export function useListState<T>({
  endpoint,
  defaultSort,
  defaultOrder = 'asc',
  pageSize = DEFAULT_PAGE_SIZE,
}: UseListStateOptions): UseListStateReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sort, setSortState] = useState(defaultSort);
  const [order, setOrderState] = useState<'asc' | 'desc'>(defaultOrder);
  const [tick, setTick] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          sort,
          order,
        });

        const res = await fetch(`${endpoint}?${params.toString()}`);
        const json: PaginatedApiResponse<T> = await res.json();

        if (cancelled) return;

        if (!res.ok || json.error) {
          setError(json.error ?? 'Failed to load data');
          setData([]);
        } else {
          setData(json.data ?? []);
          setTotalRecords(json.total ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
          setData([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [endpoint, page, pageSize, sort, order, tick]);

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next));
  }, []);

  const setSort = useCallback((column: string) => {
    setSortState((prev) => {
      if (prev === column) {
        setOrderState((o) => (o === 'asc' ? 'desc' : 'asc'));
        return column;
      }
      setOrderState('asc');
      return column;
    });
    setPageState(1);
  }, []);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  return {
    data,
    isLoading,
    error,
    page,
    totalPages,
    totalRecords,
    sort,
    order,
    setPage,
    setSort,
    reload,
  };
}
