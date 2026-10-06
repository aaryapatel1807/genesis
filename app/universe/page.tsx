'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, Layers, Search, Sparkles } from 'lucide-react';
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
    body: 'Highlight novel connections as they form.',
  },
  {
    icon: Layers,
    title: 'Cross-Domain Mapping',
    body: 'Link science, policy, and economics.',
  },
];

export default function UniversePage() {
  const router = useRouter();
  const { container, enterUp, enter } = useMotionVariants();
  const announce = useWorldStore((s) => s.announce);
  const [query, setQuery] = useState('');

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    const q = query.trim();
    announce(q ? `Searching entities for ${q}` : 'Opening the knowledge universe');
    router.push(q ? `/world?q=${encodeURIComponent(q)}` : '/world');
  };

  return (
    <AppShell chrome="landing" title="Living Knowledge Universe">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6"
      >
        <motion.div variants={enterUp}>
          {/* Reference-kit orb (CSS pulse; static under reduced-motion via globals) */}
          <div className="orb" aria-hidden="true" />
        </motion.div>

        <motion.h1
          variants={enterUp}
          className="mt-8 text-4xl font-bold tracking-tight text-ink sm:text-5xl"
        >
          Living Knowledge Universe
        </motion.h1>
        <motion.p variants={enterUp} className="mt-3 max-w-md text-base text-muted">
          Real-time evolving knowledge space
        </motion.p>

        <motion.form
          variants={enterUp}
          onSubmit={submit}
          role="search"
          aria-label="Search entities, concepts, documents"
          className="search searchbig glass mt-8"
          style={{ borderRadius: 999 }}
        >
          <Search size={18} aria-hidden="true" className="shrink-0 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entities, concepts, documents…"
            aria-label="Search entities, concepts, documents"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-void transition-transform hover:scale-105"
          >
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </motion.form>

        <motion.div variants={enterUp} className="feat mt-10">
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
              announce('Exploring Genesis');
              router.push('/world');
            }}
            icon={<ArrowRight size={18} aria-hidden="true" />}
          >
            Explore Genesis
          </Button>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
