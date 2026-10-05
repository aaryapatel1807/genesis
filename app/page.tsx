'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AmbientField } from '@/components/AmbientField';
import { Button } from '@/components/ui/button';
import { useMotionVariants } from '@/lib/motion';

const STEPS = [
  { title: 'Generate', body: 'Live search builds the universe in seconds.' },
  { title: 'Explore', body: 'Click any entity. Every claim carries evidence.' },
  { title: 'Simulate', body: 'Pose a scenario. Watch the cascade ripple.' },
];

export default function Home() {
  const router = useRouter();
  const { container, enterUp, enter } = useMotionVariants();

  return (
    <main className="relative min-h-screen overflow-hidden bg-void text-ink">
      {/* Living ambient network — matches the approved landing mockup */}
      <AmbientField />
      {/* Faint dot grid — 4% opacity, hero only (Theme.md) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(238,242,248,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      {/* Soft vignette */}
      <div
        aria-hidden="true"
        className="vignette pointer-events-none absolute inset-0"
      />

      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center"
      >
        <motion.p
          variants={enter}
          className="font-mono text-[11px] uppercase tracking-[0.35em] text-muted"
        >
          A living world model
        </motion.p>
        <motion.h1
          variants={enterUp}
          className="mt-4 text-[44px] font-bold leading-none tracking-[-0.02em] sm:text-[56px]"
        >
          GENESIS
        </motion.h1>
        <motion.p variants={enterUp} className="mt-4 text-lg text-muted">
          Ask anything. Watch a world emerge.
        </motion.p>

        <motion.div variants={enterUp} className="mt-10 w-full max-w-xl">
          <label
            htmlFor="topic"
            className="mb-2 block text-left font-mono text-[11px] uppercase tracking-[0.2em] text-muted"
          >
            Topic
          </label>
          <input
            id="topic"
            type="text"
            value="Artificial Intelligence"
            disabled
            aria-describedby="topic-note"
            className="w-full rounded-xl border border-line bg-surface-2 px-5 py-4 text-center text-lg text-ink opacity-70 disabled:cursor-not-allowed"
          />
          <p id="topic-note" className="mt-2 text-[11px] text-muted">
            v1: AI Ecosystem — the topic is fixed for the demo build.
          </p>
        </motion.div>

        <motion.div variants={enterUp}>
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/world')}
            className="mt-8"
          >
            Generate World
          </Button>
        </motion.div>

        <motion.div
          variants={container}
          className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3"
        >
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              variants={enterUp}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
              className="rounded-[14px] border border-line bg-surface/80 p-5 backdrop-blur-sm"
            >
              <p className="font-mono text-[11px] text-gold">
                {String(i + 1).padStart(2, '0')}
              </p>
              <h2 className="mt-2 text-[15px] font-semibold">{step.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.footer
          variants={enter}
          className="mt-16 pb-8 text-[11px] text-muted"
        >
          Built with SerpApi live search · Demo for SerpApi India Hackathon 2026
        </motion.footer>
      </motion.div>
    </main>
  );
}
