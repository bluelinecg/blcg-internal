import { renderHook, act, waitFor } from '@testing-library/react';
import { useListState } from './use-list-state';

const mockFetch = jest.fn();
beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockClear();
});

function makeResponse(data: unknown[], total: number, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve({ data, total, error: null }),
  } as Response);
}

function makeErrorResponse(error: string) {
  return Promise.resolve({
    ok: false,
    json: () => Promise.resolve({ data: null, total: 0, error }),
  } as Response);
}

describe('useListState', () => {
  // --- Initial state ---

  it('starts in a loading state', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    expect(result.current.isLoading).toBe(true);
  });

  it('initializes with the provided defaultSort', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'created_at' }),
    );
    expect(result.current.sort).toBe('created_at');
  });

  it('initializes with asc order by default', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    expect(result.current.order).toBe('asc');
  });

  it('initializes with the provided defaultOrder', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name', defaultOrder: 'desc' }),
    );
    expect(result.current.order).toBe('desc');
  });

  it('initializes on page 1', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    expect(result.current.page).toBe(1);
  });

  // --- Successful fetch ---

  it('populates data after a successful fetch', async () => {
    mockFetch.mockReturnValue(makeResponse([{ id: '1' }, { id: '2' }], 2));
    const { result } = renderHook(() =>
      useListState<{ id: string }>({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('sets totalRecords from the response total', async () => {
    mockFetch.mockReturnValue(makeResponse([{ id: '1' }], 25));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalRecords).toBe(25);
  });

  it('computes totalPages from totalRecords and pageSize', async () => {
    mockFetch.mockReturnValue(makeResponse([], 25));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name', pageSize: 10 }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalPages).toBe(3);
  });

  it('clears the loading flag after fetch completes', async () => {
    mockFetch.mockReturnValue(makeResponse([], 0));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  // --- Error handling ---

  it('sets error when the response is not ok', async () => {
    mockFetch.mockReturnValue(makeErrorResponse('Forbidden'));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Forbidden');
    expect(result.current.data).toEqual([]);
  });

  it('sets a fallback error message when the response body has no error field', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ data: null, total: 0, error: null }),
      } as Response),
    );
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Failed to load data');
  });

  it('sets error when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network failure');
  });

  // --- setPage ---

  it('setPage updates the page number', async () => {
    mockFetch.mockReturnValue(makeResponse([], 50));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
  });

  it('setPage clamps to 1 when given 0', async () => {
    mockFetch.mockReturnValue(makeResponse([], 50));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setPage(0));
    expect(result.current.page).toBe(1);
  });

  // --- setSort ---

  it('setSort changes the active column and resets to page 1', async () => {
    mockFetch.mockReturnValue(makeResponse([], 50));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setPage(3));
    act(() => result.current.setSort('status'));
    expect(result.current.sort).toBe('status');
    expect(result.current.page).toBe(1);
  });

  it('setSort resets order to asc when a new column is selected', async () => {
    mockFetch.mockReturnValue(makeResponse([], 10));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name', defaultOrder: 'desc' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setSort('status'));
    expect(result.current.order).toBe('asc');
  });

  it('setSort toggles order when the same column is clicked while asc', async () => {
    mockFetch.mockReturnValue(makeResponse([], 10));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name', defaultOrder: 'asc' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setSort('name'));
    expect(result.current.order).toBe('desc');
  });

  it('setSort toggles order when the same column is clicked while desc', async () => {
    mockFetch.mockReturnValue(makeResponse([], 10));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name', defaultOrder: 'desc' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setSort('name'));
    expect(result.current.order).toBe('asc');
  });

  // --- reload ---

  it('reload triggers a re-fetch', async () => {
    mockFetch.mockReturnValue(makeResponse([], 0));
    const { result } = renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = mockFetch.mock.calls.length;
    act(() => result.current.reload());
    await waitFor(() => expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  // --- URL construction ---

  it('includes page, pageSize, sort, and order in the fetch URL', async () => {
    mockFetch.mockReturnValue(makeResponse([], 0));
    renderHook(() =>
      useListState({ endpoint: '/api/items', defaultSort: 'name', pageSize: 20 }),
    );
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('page=1');
    expect(url).toContain('pageSize=20');
    expect(url).toContain('sort=name');
    expect(url).toContain('order=asc');
  });
});
