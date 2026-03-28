// GET  /api/catalog — list catalog items (paginated, sortable; ?activeOnly=true for picker)
// POST /api/catalog — create a new catalog item
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { NextResponse } from 'next/server';
import { listCatalogItems, createCatalogItem } from '@/lib/db/catalog';
import { CatalogItemSchema } from '@/lib/validations/catalog';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { logAction } from '@/lib/utils/audit';
import { requireAuth, apiError, apiOk, apiList } from '@/lib/api/utils';

// GET /api/catalog
export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const searchParams = new URL(request.url).searchParams;
    const options = parseListParams(searchParams);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const { data, total, error } = await listCatalogItems({ ...options, activeOnly });
    if (error) return apiError(error, 500);

    return apiList(data, total);
  } catch (err) {
    console.error('[GET /api/catalog]', err);
    return apiError('Failed to load catalog items', 500);
  }
}

// POST /api/catalog
export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = CatalogItemSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createCatalogItem(parsed.data);
    if (error) return apiError(error, 500);

    if (data) {
      void logAction({
        entityType:  'catalog_item',
        entityId:    data.id,
        entityLabel: data.name,
        action:      'created',
      });
    }

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/catalog]', err);
    return apiError('Failed to create catalog item', 500);
  }
}
