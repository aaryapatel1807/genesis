'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bookmark, Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useMotionVariants } from '@/lib/motion';

export default function SavedPage() {
  const router = useRouter();
  const { container, enterUp } = useMotionVariants();

  return (
    <AppShell chrome="app" title="Saved">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex min-h-[60dvh] w-full max-w-xl flex-col items-center justify-center"
      >
        <motion.div variants={enterUp} className="glass flex w-full flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-white/5">
            <Bookmark size={22} aria-hidden="true" className="text-teal" />
          </span>
          <h2 className="text-xl font-semibold text-ink">No saved worlds yet</h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            When you generate a world, you will be able to save it here and
            revisit it anytime from this shelf.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push('/generator')}
            icon={<Plus size={16} aria-hidden="true" />}
            className="mt-2"
          >
            Generate your first world
          </Button>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
