import { describe, expect, it } from 'vitest';
import { GET as getBuild, POST as postBuild } from '../app/api/build/route';
import {
  normalizeAnswer,
  sanitizeQuestion,
  trustFor,
  type CleanResult,
} from '../lib/build';

function req(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

const RESULTS: CleanResult[] = [
  { title: 'T1', snippet: 'S1', link: 'https://a.com/1', source: 'A News' },
  { title: 'T2', snippet: 'S2', link: 'https://b.com/2', source: 'B News' },
  { title: 'T3', snippet: 'S3', link: 'https://c.com/3', source: 'C News' },
  { title: 'T4', snippet: 'S4', link: 'https://d.com/4', source: 'D News' },
];

describe('build.sanitizeQuestion', () => {
  it('trims, strips angle brackets and caps length', () => {
    expect(sanitizeQuestion('  <b>hi</b> ')).toBe('bhi/b');
    expect(sanitizeQuestion('x'.repeat(500)).length).toBe(300);
    expect(sanitizeQuestion(42)).toBe('');
    expect(sanitizeQuestion('')).toBe('');
  });
});

describe('build.trustFor (code-computed, never AI)', () => {
  it('rates by distinct-source agreement', () => {
    const src = (i: number) => ({ name: `S${i}`, link: `https://s${i}.com/x` });
    expect(trustFor([src(1), src(2), src(3), src(4), src(5)]).trust).toBe('Well supported');
    expect(trustFor([src(1), src(2), src(3)]).trust).toBe('Some support');
    expect(trustFor([src(1)]).trust).toBe('Unsure');
    expect(trustFor([]).trust).toBe('Unsure');
  });

  it('dedupes by domain, not by raw count', () => {
    const many = [
      { name: 'A', link: 'https://a.com/1' },
      { name: 'A', link: 'https://a.com/2' },
      { name: 'A', link: 'https://a.com/3' },
      { name: 'A', link: 'https://a.com/4' },
      { name: 'A', link: 'https://a.com/5' },
    ];
    const { trust, supportingSources } = trustFor(many);
    expect(trust).toBe('Unsure');
    expect(supportingSources).toBe(1);
  });
});

describe('build.normalizeAnswer', () => {
  it('coerces groups, drops phantom links, keeps only real source URLs', () => {
    const raw = {
      answer: [
        { point: 'P1', sentence: 'S1.' },
        { point: 'P2', sentence: 'S2.' },
        { point: 'P3', sentence: 'S3.' },
        { point: 'P4-extra', sentence: 'S4.' },
      ],
      entities: [
        { name: 'OpenAI', group: 'Companies', description: 'AI lab.' },
        { name: 'Mystery', group: 'NotAGroup', description: 'Coerced to Ideas.' },
      ],
      links: [
        { from: 'OpenAI', to: 'Mystery', reason: 'They work together.' },
        { from: 'OpenAI', to: 'Nobody', reason: 'Phantom — dropped.' },
      ],
      sources: [
        { name: 'A News', link: 'https://a.com/1', date: '2026-10-08' },
        { name: 'Evil', link: 'https://evil.com/hallucinated', date: '' },
      ],
    };
    const out = normalizeAnswer('q?', raw, RESULTS);
    expect(out.answer).toHaveLength(3);
    expect(out.entities).toHaveLength(2);
    expect(out.entities[1].group).toBe('Ideas');
    expect(out.links).toHaveLength(1);
    expect(out.links[0].from).toBe('OpenAI');
    expect(out.sources).toHaveLength(1);
    expect(out.sources[0].link).toBe('https://a.com/1');
    expect(out.trust).toBe('Unsure');
    expect(out.supportingSources).toBe(1);
    expect(out.isLiveResearch).toBe(true);
  });

  it('falls back to raw results when the LLM source list is unusable', () => {
    const out = normalizeAnswer('q?', { answer: [], entities: [], links: [], sources: [] }, RESULTS);
    expect(out.sources).toHaveLength(4);
    expect(out.trust).toBe('Well supported');
    expect(out.supportingSources).toBe(4);
  });

  it('survives garbage input', () => {
    const out = normalizeAnswer('q?', null, []);
    expect(out.answer).toEqual([]);
    expect(out.sources).toEqual([]);
    expect(out.trust).toBe('Unsure');
  });
});

describe('POST /api/build', () => {
  async function post(body: unknown) {
    return postBuild(
      req('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  }

  it('400s a missing question with a machine-readable code', async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('QUESTION_REQUIRED');
  });

  it('503s honestly when live search is not configured', async () => {
    if (process.env.SERPAPI_API_KEY) return; // live env: skip
    const res = await post({ question: 'What is new with AI agents?' });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe('SEARCH_UNAVAILABLE');
    expect(json.isLiveResearch).toBe(true);
  });

  it('GET ?q= follows the same pipeline', async () => {
    if (process.env.SERPAPI_API_KEY) return;
    const res = await getBuild(req('/api/build?q=hello'));
    expect(res.status).toBe(503);
  });

  it('GET without q is a 400, not a 500', async () => {
    const res = await getBuild(req('/api/build'));
    expect(res.status).toBe(400);
  });
});
