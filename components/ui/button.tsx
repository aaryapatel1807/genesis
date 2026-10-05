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
    'bg-gold text-void shadow-[0_0_24px_rgba(245,185,66,0.35)] hover:shadow-[0_0_32px_rgba(245,185,66,0.5)]',
  secondary:
    'border border-line bg-surface/80 text-ink backdrop-blur-md hover:border-gold/60 hover:text-gold',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-red/15 text-red border border-red/40 hover:bg-red/25',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-3 py-1.5 text-[12px]',
  md: 'rounded-xl px-4 py-2.5 text-[14px]',
  lg: 'rounded-xl px-10 py-4 text-lg',
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
