'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, Network, Search, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
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
        {/* Swirling-galaxy backdrop (reference kit) */}
        <div className="galaxy" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>

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

          {/* Glass search pill (reference kit) */}
          <motion.form
            variants={enterUp}
            onSubmit={submit}
            role="search"
            aria-label="Search the universe"
            className="search searchbig glass mt-9"
            style={{ borderRadius: 999 }}
          >
            <Search size={18} aria-hidden="true" className="shrink-0 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the universe…"
              aria-label="Search the universe"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-void transition-transform hover:scale-105"
            >
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </motion.form>
          <motion.div variants={enterUp} className="mt-3">
            <button
              type="button"
              onClick={() => setQuery(EXAMPLE_QUERY)}
              className="ghost"
            >
              Try: &lsquo;{EXAMPLE_QUERY}&rsquo;
            </button>
          </motion.div>

          {/* Feature cards (reference kit) */}
          <motion.div
            variants={enterUp}
            id="features"
            className="feat mt-12 scroll-mt-24"
          >
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="glass">
                  <span className="text-teal">
                    <Icon size={20} aria-hidden="true" strokeWidth={1.4} />
                  </span>
                  <h2 className="mt-3.5 text-sm font-semibold text-ink">{f.title}</h2>
                  <p>{f.body}</p>
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
