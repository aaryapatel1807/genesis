/**
 * GET /api/world/snapshot/[year] — serve a precomputed historical snapshot.
 * year must be one of 2020|2022|2024|2026, anything else is 404.
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const YEARS = new Set(['2020', '2022', '2024', '2026']);

export async function GET(
  _req: Request,
  { params }: { params: { year: string } }
): Promise<NextResponse> {
  if (!YEARS.has(params.year)) {
    return NextResponse.json({ error: 'unknown snapshot' }, { status: 404 });
  }
  try {
    const world = await getDb().getSnapshot(params.year);
    return new NextResponse(JSON.stringify(world), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'snapshot not built yet' }, { status: 404 });
  }
}
