'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Network, Search } from 'lucide-react';
import { GenesisLogo } from './GenesisLogo';
import type { TrendingItem } from '@/app/api/trending/route';

const EXAMPLE_CHIPS = ['Is AI taking jobs?', 'Who makes the AI chips?', 'Which AI tools are most used?'];

const FEATURES = [
  {
    icon: Search,
    title: 'Looks things up for you',
    body: 'Genesis reads many web pages in seconds, so you do not have to open ten tabs.',
    tile: '#d9f6e7',
    color: '#0d7a6a',
  },
  {
    icon: Check,
    title: 'Tells you what to trust',
    body: 'Every answer shows its sources, the date, and a simple rating: well supported, some support, or unsure.',
    tile: '#fdf3dd',
    color: '#dd8a0a',
  },
  {
    icon: Network,
    title: 'Shows how it fits together',
    body: 'A friendly map shows who and what is connected. Tap any shape to learn more.',
    tile: '#fde4ef',
    color: '#ec4899',
  },
];

function useTrending(): TrendingItem[] {
  const [items, setItems] = useState<TrendingItem[]>([]);
  useEffect(() => {
    let live = true;
    fetch('/api/trending')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d && Array.isArray(d.items)) setItems(d.items as TrendingItem[]);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return items;
}

export function LandingPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const trending = useTrending();

  const ask = (q: string): void => {
    const clean = q.trim();
    if (clean) router.push(`/answer?q=${encodeURIComponent(clean)}`);
  };

  const scrollTo = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="genesis-qa">
      {/* nav */}
      <header className="qa-nav qa-wrap">
        <div className="qa-nav-inner">
          <GenesisLogo />
          <nav className="qa-nav-links" aria-label="Primary">
            <a href="#how" onClick={(e) => { e.preventDefault(); scrollTo('how'); }}>How it works</a>
            <a href="#examples" onClick={(e) => { e.preventDefault(); scrollTo('examples'); }}>Examples</a>
            <a href="#ask" onClick={(e) => { e.preventDefault(); scrollTo('ask'); }}>Ask a question</a>
          </nav>
          <button type="button" className="qa-pill-btn teal" onClick={() => scrollTo('ask')}>
            Start free
          </button>
        </div>
      </header>

      {/* hero */}
      <section className="qa-hero qa-wrap" id="ask">
        <span className="qa-live-badge">
          <span className="dot" aria-hidden="true" />
          Answers from live Google results, powered by SerpApi
        </span>
        <h1>
          Ask anything.
          <br />
          See the answer, then the big picture.
        </h1>
        <p className="sub">
          Genesis searches the web for you, explains what it found in plain words, and draws a simple
          map so you can see how everything connects.
        </p>

        <form
          className="qa-search"
          onSubmit={(e) => {
            e.preventDefault();
            ask(query);
          }}
        >
          <div className="qa-search-bar">
            <Search size={20} aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type any question, for example: Is AI taking jobs?"
              aria-label="Ask a question"
            />
            <button type="submit" className="qa-pill-btn amber">
              Get my answer
            </button>
          </div>
          <div className="qa-try">
            <span>Not sure what to ask? Try:</span>
            {EXAMPLE_CHIPS.map((c) => (
              <button key={c} type="button" className="qa-chip" onClick={() => ask(c)}>
                {c}
              </button>
            ))}
          </div>
        </form>

        <div className="qa-steps" id="how">
          {['Ask', 'Watch Genesis read the web', 'Explore your answer'].map((s, i) => (
            <span key={s} className="qa-step">
              <span className="n">{i + 1}</span>
              {s}
              {i < 2 && <ArrowRight size={16} className="arrow" aria-hidden="true" />}
            </span>
          ))}
        </div>

        <div className="qa-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="qa-feature">
              <span className="icon-tile" style={{ background: f.tile, color: f.color }}>
                <f.icon size={22} aria-hidden="true" />
              </span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* trending */}
      {trending.length > 0 && (
        <section className="qa-trending qa-wrap" id="examples">
          <div className="qa-trending-head">
            <h2>What the world is asking today</h2>
            <p>Fresh from Google News</p>
          </div>
          <div className="qa-trending-grid">
            {trending.map((t) => (
              <button key={t.query} type="button" className="qa-trend-card" onClick={() => ask(t.query)}>
                <span className="q">{t.title}</span>
                <span className="meta">
                  {t.source}
                  {t.date ? ` · ${t.date}` : ''}
                </span>
                <span className="ask">
                  Ask about this <ArrowRight size={14} aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="qa-footer qa-wrap">
        <span>Genesis — answers from live Google results, powered by SerpApi.</span>
        <a href="/world">Explore the world map →</a>
      </footer>
    </div>
  );
}
