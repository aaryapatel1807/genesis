/**
 * GET /api/world — serve the precomputed universe (0 SerpApi cost).
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(): Promise<NextResponse> {
  try {
    const world = await getDb().getWorld();
    return new NextResponse(JSON.stringify(world), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'world not built yet' }, { status: 500 });
  }
}
