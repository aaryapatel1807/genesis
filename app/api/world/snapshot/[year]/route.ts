/**
 * GET /api/world/snapshot/[year] — serve a precomputed historical snapshot.
 * year must be one of 2020|2022|2024|2026, anything else is 404.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

const YEARS = new Set(['2020', '2022', '2024', '2026']);

export async function GET(
  _req: Request,
  { params }: { params: { year: string } }
): Promise<NextResponse> {
  if (!YEARS.has(params.year)) {
    return NextResponse.json({ error: 'unknown snapshot' }, { status: 404 });
  }
  try {
    const raw = await readFile(join(process.cwd(), 'data', 'snapshots', `${params.year}.json`), 'utf-8');
    return new NextResponse(raw, {
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
