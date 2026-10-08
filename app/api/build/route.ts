/**
 * POST /api/build { question } — live research: SerpApi (google + google_news)
 * → Groq JSON (3 answer points, entities, links, sources) → code-computed
 * trust rating → question-keyed cache.
 *
 * GET /api/build?q=... — same pipeline, for hitting in the browser.
 *
 * Every payload carries isLiveResearch:true. Friendly errors, never raw
 * stack traces. Repeat questions serve from cache in milliseconds.
 */
import { NextResponse } from 'next/server';
import { getBuild, sanitizeQuestion } from '@/lib/build';

const err = (error: string, code: string, status: number): NextResponse =>
  NextResponse.json({ error, code, isLiveResearch: true }, { status });

async function build(question: unknown): Promise<NextResponse> {
  const q = sanitizeQuestion(question);
  if (!q) {
    return err('question is required', 'QUESTION_REQUIRED', 400);
  }
  try {
    const answer = await getBuild(q);
    return NextResponse.json(answer, {
      headers: { 'Cache-Control': 'public, s-maxage=60' },
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'SERPAPI_KEY_MISSING') {
      return err(
        'Live search is not configured on this deployment yet.',
        'SEARCH_UNAVAILABLE',
        503,
      );
    }
    if (e instanceof Error && e.message === 'QUESTION_REQUIRED') {
      return err('question is required', 'QUESTION_REQUIRED', 400);
    }
    return err("We couldn't build that answer — please try again.", 'BUILD_FAILED', 500);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const parsed: unknown = await req.json().catch(() => ({}));
  const body = (parsed !== null && typeof parsed === 'object' ? parsed : {}) as {
    question?: unknown;
  };
  return build(body.question);
}

export async function GET(req: Request): Promise<NextResponse> {
  const q = new URL(req.url).searchParams.get('q');
  return build(q);
}
