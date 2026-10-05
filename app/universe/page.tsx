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

/**
 * The living orb — layered radial-gradient divs (design tokens only),
 * slow framer-motion pulse. Static under reduced motion.
 */
function Orb({ reduced }: { reduced: boolean }) {
  const pulse = reduced
    ? {}
    : {
        scale: [1, 1.07, 1],
        opacity: [0.5, 0.68, 0.5],
      };
  return (
    <div aria-hidden="true" className="relative mx-auto h-60 w-60 sm:h-72 sm:w-72">
      {/* Outer teal halo */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, var(--teal) 0%, transparent 62%)',
          filter: 'blur(34px)',
        }}
        animate={pulse}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Gold crescent glow */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 72% 28%, var(--gold) 0%, transparent 48%)',
          filter: 'blur(22px)',
        }}
        animate={reduced ? {} : { opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Core sphere */}
      <div
        className="absolute inset-10 rounded-full border border-line"
        style={{
          background:
            'radial-gradient(circle at 38% 32%, var(--teal) 0%, color-mix(in srgb, var(--teal) 22%, var(--void)) 38%, var(--void) 78%)',
          boxShadow:
            'inset 0 0 48px rgba(0,0,0,0.65), 0 0 64px color-mix(in srgb, var(--teal) 30%, transparent)',
        }}
      />
      {/* Surface filaments */}
      <div
        className="absolute inset-10 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 60% 70%, transparent 30%, color-mix(in srgb, var(--gold) 26%, transparent) 58%, transparent 72%)',
          filter: 'blur(6px)',
        }}
      />
    </div>
  );
}

export default function UniversePage() {
  const router = useRouter();
  const { container, enterUp, enter, reduced } = useMotionVariants();
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
          <Orb reduced={reduced} />
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
          className="mt-8 w-full max-w-xl"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/60 px-5 py-4 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-colors focus-within:border-teal/60">
            <Search size={18} aria-hidden="true" className="shrink-0 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entities, concepts, documents…"
              aria-label="Search entities, concepts, documents"
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
        </motion.form>

        <motion.div
          variants={enterUp}
          className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3"
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
