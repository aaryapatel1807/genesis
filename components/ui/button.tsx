'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { GENESIS_EASE } from '@/lib/motion';

/**
 * Genesis Button — shadcn-style primitive with the full component state
 * matrix: default / hover / pressed / selected / focused / disabled /
 * loading / error / success. Visuals match the approved design system
 * (gold primary, ghost secondary, thin borders).
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-[linear-gradient(180deg,var(--gold-hi),var(--gold-lo))] text-[var(--gold-ink)] shadow-[0_0_40px_color-mix(in_srgb,var(--gold)_35%,transparent)] hover:shadow-[0_0_52px_color-mix(in_srgb,var(--gold)_50%,transparent)]',
  secondary:
    'border border-line bg-white/5 text-ink backdrop-blur-md hover:border-teal/50 hover:text-teal',
  ghost: 'text-muted hover:bg-teal/10 hover:text-teal',
  danger: 'bg-red/15 text-red border border-red/40 hover:bg-red/25',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'rounded-full px-4 py-1.5 text-[12px]',
  md: 'rounded-full px-5 py-2.5 text-[14px]',
  lg: 'rounded-full px-10 py-4 text-lg',
  icon: 'rounded-full p-2',
};

export interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'
  > {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Loading state: spinner replaces the icon, press is locked. */
  loading?: boolean;
  /** Success flash (e.g. copied, saved) — brief gold/green tint. */
  success?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      success = false,
      icon,
      className,
      children,
      disabled,
      type = 'button',
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || loading;
    const interactive = !isDisabled && !success;

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        data-variant={variant}
        data-loading={loading || undefined}
        data-success={success || undefined}
        whileHover={interactive ? { scale: 1.03 } : undefined}
        whileTap={interactive ? { scale: 0.97 } : undefined}
        transition={{ duration: 0.18, ease: GENESIS_EASE }}
        className={cn(
          'inline-flex select-none items-center justify-center gap-2 font-semibold',
          'transition-colors focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-40',
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          success && 'border-teal/60 text-teal',
          className,
        )}
        {...rest}
      >
        {loading ? (
          <Loader2 size={16} aria-hidden="true" className="animate-spin" />
        ) : (
          icon
        )}
        {children}
      </motion.button>
    );
  },
);
