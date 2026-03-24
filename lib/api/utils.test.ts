/**
 * @jest-environment node
 */
// Unit tests for lib/api/utils.ts
// @clerk/nextjs/server is mocked — no real Clerk session needed.
// Uses the node environment so that Next.js Web API globals (Request, Response)
// are available natively via Node 18+ built-ins.

import { requireAuth, apiError, apiOk } from './utils';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

import { auth } from '@clerk/nextjs/server';
const mockAuth = auth as unknown as jest.Mock;

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------

describe('requireAuth', () => {
  it('returns { userId } when auth succeeds', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_abc123' });
    const result = await requireAuth();
    expect(result).toEqual({ userId: 'user_abc123' });
  });

  it('returns a 401 NextResponse when userId is null', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const result = await requireAuth();
    expect(result).toBeInstanceOf(Response);
    const res = result as Response;
    expect(res.status).toBe(401);
    const body = await res.json() as { data: null; error: string };
    expect(body.data).toBeNull();
    expect(body.error).toBe('Unauthorised');
  });

  it('returns a 401 NextResponse when userId is undefined', async () => {
    mockAuth.mockResolvedValue({ userId: undefined });
    const result = await requireAuth();
    expect(result).toBeInstanceOf(Response);
    const res = result as Response;
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// apiError
// ---------------------------------------------------------------------------

describe('apiError', () => {
  it('returns a NextResponse with the given message and status', async () => {
    const res = apiError('Something went wrong', 500);
    expect(res.status).toBe(500);
    const body = await res.json() as { data: null; error: string };
    expect(body.data).toBeNull();
    expect(body.error).toBe('Something went wrong');
  });

  it('works with 400 status', async () => {
    const res = apiError('Invalid input', 400);
    expect(res.status).toBe(400);
    const body = await res.json() as { data: null; error: string };
    expect(body.error).toBe('Invalid input');
  });

  it('works with 404 status', async () => {
    const res = apiError('Not found', 404);
    expect(res.status).toBe(404);
    const body = await res.json() as { data: null; error: string };
    expect(body.error).toBe('Not found');
  });
});

// ---------------------------------------------------------------------------
// apiOk
// ---------------------------------------------------------------------------

describe('apiOk', () => {
  it('returns a 200 NextResponse with { data, error: null } by default', async () => {
    const res = apiOk({ id: '1', name: 'Acme' });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { id: string; name: string }; error: null };
    expect(body.data).toEqual({ id: '1', name: 'Acme' });
    expect(body.error).toBeNull();
  });

  it('respects a custom status code', async () => {
    const res = apiOk({ id: '2' }, 201);
    expect(res.status).toBe(201);
    const body = await res.json() as { data: { id: string }; error: null };
    expect(body.data).toEqual({ id: '2' });
    expect(body.error).toBeNull();
  });

  it('works with null data', async () => {
    const res = apiOk(null);
    expect(res.status).toBe(200);
    const body = await res.json() as { data: null; error: null };
    expect(body.data).toBeNull();
    expect(body.error).toBeNull();
  });

  it('works with array data', async () => {
    const res = apiOk([1, 2, 3]);
    const body = await res.json() as { data: number[]; error: null };
    expect(body.data).toEqual([1, 2, 3]);
    expect(body.error).toBeNull();
  });
});
