// GET    /api/catalog/[id] — fetch a single catalog item
// PATCH  /api/catalog/[id] — update a catalog item
// DELETE /api/catalog/[id] — delete a catalog item
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { getCatalogItemById, updateCatalogItem, deleteCatalogItem } from '@/lib/db/catalog';
import { UpdateCatalogItemSchema } from '@/lib/validations/catalog';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { logAction } from '@/lib/utils/audit';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/catalog/[id]
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { data, error } = await getCatalogItemById(id);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Catalog item not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/catalog/:id]', err);
    return apiError('Failed to load catalog item', 500);
  }
}

// PATCH /api/catalog/[id]
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateCatalogItemSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateCatalogItem(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Catalog item not found', 404);

    void logAction({
      entityType:  'catalog_item',
      entityId:    id,
      entityLabel: data.name,
      action:      'updated',
    });

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/catalog/:id]', err);
    return apiError('Failed to update catalog item', 500);
  }
}

// DELETE /api/catalog/[id]
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    const { data: existing, error: fetchErr } = await getCatalogItemById(id);
    if (fetchErr) return apiError(fetchErr, 500);
    if (!existing) return apiError('Catalog item not found', 404);

    const { error } = await deleteCatalogItem(id);
    if (error) return apiError(error, 500);

    void logAction({
      entityType:  'catalog_item',
      entityId:    id,
      entityLabel: existing.name,
      action:      'deleted',
    });

    return apiOk(null);
  } catch (err) {
    console.error('[DELETE /api/catalog/:id]', err);
    return apiError('Failed to delete catalog item', 500);
  }
}
