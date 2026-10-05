'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, Network, Search, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { AmbientField } from '@/components/AmbientField';
import { Button } from '@/components/ui/button';
import { useMotionVariants } from '@/lib/motion';
import { useWorldStore } from '@/stores/useWorldStore';

const FEATURES = [
  {
    icon: Compass,
    title: 'Autonomous Exploration',
    body: 'AI-driven data discovery across domains.',
  },
  {
    icon: Sparkles,
    title: 'Emergent Insights',
    body: 'Detect novel patterns and connections.',
  },
  {
    icon: Network,
    title: 'Causal Reasoning',
    body: 'Model cause-effect across entities.',
  },
];

const EXAMPLE_QUERY = 'impact of LLMs on hiring';

export default function LandingPage() {
  const router = useRouter();
  const { container, enterUp, enter } = useMotionVariants();
  const announce = useWorldStore((s) => s.announce);
  const [query, setQuery] = useState('');

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    const q = query.trim();
    announce(q ? `Opening the knowledge universe for ${q}` : 'Opening the knowledge universe');
    router.push(q ? `/world?q=${encodeURIComponent(q)}` : '/world');
  };

  return (
    <AppShell chrome="landing" title="Genesis">
      <div className="relative overflow-hidden">
        {/* Swirling-galaxy backdrop */}
        <AmbientField />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 45% at 50% 42%, var(--teal) 0%, transparent 60%)',
            opacity: 0.08,
          }}
        />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6"
        >
          <motion.h1
            variants={enterUp}
            className="text-6xl font-bold tracking-[0.18em] text-ink sm:text-7xl md:text-8xl"
          >
            GENESIS
          </motion.h1>
          <motion.p
            variants={enterUp}
            className="mt-5 max-w-xl text-base text-muted sm:text-lg"
          >
            Explore &bull; Map &bull; Reason &bull; Simulate your knowledge universe
          </motion.p>

          {/* Glass search bar */}
          <motion.form
            variants={enterUp}
            onSubmit={submit}
            role="search"
            aria-label="Search the universe"
            className="mt-9 w-full max-w-xl"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/60 px-5 py-4 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-colors focus-within:border-teal/60">
              <Search size={18} aria-hidden="true" className="shrink-0 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the universe…"
                aria-label="Search the universe"
                className="w-full bg-transparent text-[15px] text-ink placeholder:text-muted/60 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold text-void transition-transform hover:scale-105"
              >
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setQuery(EXAMPLE_QUERY)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-surface/40 px-3.5 py-1.5 text-xs text-muted/80 backdrop-blur-md transition-colors hover:border-gold/50 hover:text-ink"
            >
              Try: &lsquo;{EXAMPLE_QUERY}&rsquo;
            </button>
          </motion.form>

          {/* Feature cards */}
          <motion.div
            variants={enterUp}
            id="features"
            className="mt-12 grid w-full max-w-3xl scroll-mt-24 grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-line bg-surface/60 p-5 text-left backdrop-blur-xl"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-teal">
                    <Icon size={19} aria-hidden="true" strokeWidth={1.8} />
                  </span>
                  <h2 className="mt-3.5 text-sm font-semibold text-ink">{f.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{f.body}</p>
                </div>
              );
            })}
          </motion.div>

          <motion.div variants={enter} className="mt-10">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                announce('Launching Genesis');
                router.push('/world');
              }}
              icon={<ArrowRight size={18} aria-hidden="true" />}
            >
              Launch Genesis
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </AppShell>
  );
}
