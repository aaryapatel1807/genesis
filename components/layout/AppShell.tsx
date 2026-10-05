'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  FlaskConical,
  Globe2,
  History,
  Home,
  LogIn,
  Orbit,
  Settings,
  Share2,
  Sparkles,
  TerminalSquare,
  UserPlus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Tooltip } from '@/components/ui/tooltip';
import { useWorldStore } from '@/stores/useWorldStore';

export type AppChrome = 'landing' | 'app';

interface AppShellProps {
  children: React.ReactNode;
  chrome: AppChrome;
  /** Page title — shown as the breadcrumb in app chrome, nav label in landing chrome. */
  title: string;
}

interface RailLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number | string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

const RAIL_LINKS: RailLink[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/world', label: 'Knowledge', icon: Globe2 },
  { href: '/generator', label: 'World Generator', icon: Sparkles },
  { href: '/universe', label: 'Universe', icon: Orbit },
  { href: '/graph', label: 'Graph', icon: Share2 },
  { href: '/timeline', label: 'Timeline', icon: History },
  { href: '/simulate', label: 'Scenario Lab', icon: FlaskConical },
  { href: '/console', label: 'Console', icon: TerminalSquare },
];

const LANDING_NAV = [
  { href: '/#features', label: 'Features' },
  { href: '/world', label: 'Knowledge' },
  { href: '/timeline', label: 'Timeline' },
];

type AuthSheet = 'login' | 'signup' | null;

function AuthSheetPanel({ kind, onClose }: { kind: Exclude<AuthSheet, null>; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col border-l border-line bg-surface/90 p-8 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">
          Genesis
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close account dialog"
          icon={<X size={16} aria-hidden="true" />}
        />
      </div>
      <h2 className="mt-8 text-2xl font-semibold text-ink">
        {kind === 'login' ? 'Welcome back' : 'Join Genesis'}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Accounts are coming soon — auth is out of scope for this build.
      </p>
      <div className="mt-auto">
        <Button variant="secondary" className="w-full" onClick={onClose}>
          Continue exploring
        </Button>
      </div>
    </div>
  );
}

function LandingChrome({ title, children }: { title: string; children: React.ReactNode }) {
  const [sheet, setSheet] = useState<AuthSheet>(null);
  const close = (): void => setSheet(null);
  const announcement = useWorldStore((s) => s.announcement);

  return (
    <div className="flex min-h-dvh flex-col bg-void text-ink">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-void/70 backdrop-blur-xl">
        <nav
          aria-label={title}
          className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"
        >
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="Genesis home"
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-teal shadow-[0_0_10px_var(--teal)]"
            />
            <span className="text-sm font-bold tracking-[0.32em] text-ink">GENESIS</span>
          </Link>
          <ul className="hidden items-center gap-1 sm:flex">
            {LANDING_NAV.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="rounded-lg px-3.5 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSheet('login')}
              icon={<LogIn size={14} aria-hidden="true" />}
            >
              Log in
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSheet('signup')}
              icon={<UserPlus size={14} aria-hidden="true" />}
            >
              Sign up
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      {sheet !== null && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Close account dialog"
            onClick={close}
            className="absolute inset-0 cursor-default bg-void/70 backdrop-blur-sm"
          />
          <Sheet
            open
            onClose={close}
            label={sheet === 'login' ? 'Log in to Genesis' : 'Sign up for Genesis'}
            side="right"
            className="absolute right-0 top-0 h-full w-full max-w-md"
          >
            <AuthSheetPanel kind={sheet} onClose={close} />
          </Sheet>
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

function RailLinkItem({ link, active }: { link: RailLink; active: boolean }) {
  const Icon = link.icon;
  return (
    <Tooltip content={link.label}>
      <Link
        href={link.href}
        aria-label={link.label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-xl border transition-colors',
          active
            ? 'border-line bg-surface-2 text-gold shadow-[0_0_16px_rgba(245,185,66,0.15)]'
            : 'border-transparent text-muted hover:border-line hover:bg-surface-2 hover:text-ink',
        )}
      >
        <Icon size={19} aria-hidden="true" strokeWidth={active ? 2.2 : 1.8} />
      </Link>
    </Tooltip>
  );
}

function AppChrome({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const announcement = useWorldStore((s) => s.announcement);
  const isActive = (href: string): boolean =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh bg-void text-ink">
      {/* Slim icon rail — desktop */}
      <nav
        aria-label="Primary"
        className="sticky top-0 z-40 hidden h-dvh w-[72px] shrink-0 flex-col items-center gap-1.5 border-r border-line/60 bg-void/80 py-4 backdrop-blur-xl md:flex"
      >
        <Link href="/" aria-label="Genesis home" className="mb-4 flex items-center">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full bg-teal shadow-[0_0_12px_var(--teal)]"
          />
        </Link>
        {RAIL_LINKS.map((link) => (
          <RailLinkItem key={link.href} link={link} active={isActive(link.href)} />
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-line/60 bg-void/70 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
              <Link href="/" className="shrink-0 text-muted transition-colors hover:text-ink">
                Genesis
              </Link>
              <span aria-hidden="true" className="shrink-0 text-muted/50">
                /
              </span>
              <span aria-current="page" className="truncate font-medium text-ink">
                {title}
              </span>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <input
                type="search"
                disabled
                aria-label="Search (decorative)"
                placeholder="Search the universe…"
                className="hidden w-56 rounded-xl border border-line bg-surface/60 px-3.5 py-2 text-sm text-muted placeholder:text-muted/60 backdrop-blur-md lg:block"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                icon={<Bell size={18} aria-hidden="true" />}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Settings"
                icon={<Settings size={18} aria-hidden="true" />}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10">{children}</main>
      </div>

      {/* Bottom bar — mobile */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around gap-1 border-t border-line/60 bg-void/85 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
      >
        {RAIL_LINKS.map((link) => (
          <RailLinkItem key={link.href} link={link} active={isActive(link.href)} />
        ))}
      </nav>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

/**
 * AppShell — THE shared chrome for Genesis pages.
 *
 * chrome="landing": marketing top bar (wordmark, Features/Knowledge/Timeline,
 * Log in + Sign up opening a placeholder auth sheet).
 * chrome="app": slim icon rail + top bar with breadcrumb, decorative search,
 * and Bell/Settings; rail collapses to a bottom bar on mobile.
 *
 * Always renders a <main> landmark and an aria-live polite region wired to
 * useWorldStore's announcement.
 */
export function AppShell({ children, chrome, title }: AppShellProps) {
  if (chrome === 'landing') {
    return (
      <LandingChrome title={title}>
        {children}
      </LandingChrome>
    );
  }
  return <AppChrome title={title}>{children}</AppChrome>;
}
