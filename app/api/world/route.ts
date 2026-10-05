/**
 * GET /api/world — serve the precomputed universe (0 SerpApi cost).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  try {
    const raw = await readFile(join(process.cwd(), 'data', 'world.json'), 'utf-8');
    return new NextResponse(raw, {
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
