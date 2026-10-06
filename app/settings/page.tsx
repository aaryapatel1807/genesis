'use client';

import { motion } from 'framer-motion';
import { Database, Info, MoonStar } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useMotionVariants } from '@/lib/motion';

const SECTIONS = [
  {
    icon: MoonStar,
    title: 'Appearance',
    rows: [
      { label: 'Theme', value: 'Dark', note: 'locked — dark is the only theme in this build' },
    ],
  },
  {
    icon: Database,
    title: 'Data',
    rows: [
      {
        label: 'Mode',
        value: 'Cached demo',
        note: 'Genesis runs on a cached demo dataset; live generation is not connected in this build',
      },
    ],
  },
  {
    icon: Info,
    title: 'About',
    rows: [
      { label: 'Version', value: '0.1.0', note: undefined },
      { label: 'Project', value: 'Genesis — The Living World Model', note: undefined },
    ],
  },
] as const;

export default function SettingsPage() {
  const { container, enterUp } = useMotionVariants();

  return (
    <AppShell chrome="app" title="Settings">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-2xl flex-col gap-5"
      >
        <motion.div variants={enterUp}>
          <h2 className="text-2xl font-semibold text-ink">Settings</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Honest state of this build — nothing here pretends to do more than it does.
          </p>
        </motion.div>

        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <motion.section
              key={section.title}
              variants={enterUp}
              aria-label={section.title}
              className="glass"
            >
              <h4>
                <span className="flex items-center gap-2">
                  <Icon size={15} aria-hidden="true" className="text-teal" />
                  {section.title}
                </span>
              </h4>
              <dl>
                {section.rows.map((row) => (
                  <div key={row.label} className="row">
                    <dt className="shrink-0 text-muted">{row.label}</dt>
                    <dd className="text-right">
                      <span className="text-sm text-ink">{row.value}</span>
                      {row.note && (
                        <span className="mt-1 block text-xs text-muted">{row.note}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.section>
          );
        })}
      </motion.div>
    </AppShell>
  );
}
