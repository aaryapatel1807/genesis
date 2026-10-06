'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bell,
  Bookmark,
  Bot,
  Compass,
  FlaskConical,
  Globe2,
  History,
  Home,
  LogIn,
  Network,
  Plus,
  Search,
  Settings,
  Share2,
  UserPlus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { useWorldStore } from '@/stores/useWorldStore';
import { GENESIS_EASE } from '@/lib/motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import worldData from '@/data/world.json';

export type AppChrome = 'landing' | 'app';

interface AppShellProps {
  children: React.ReactNode;
  chrome: AppChrome;
  /** Page title — announced to screen readers in app chrome, nav label in landing chrome. */
  title: string;
}

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number | string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

/** Primary nav by user journey (v2). */
const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/generator', label: 'Worlds', icon: Globe2 },
  { href: '/universe', label: 'Discover', icon: Compass },
  { href: '/world', label: 'Graph Explorer', icon: Network },
  { href: '/console', label: 'AI Agents', icon: Bot },
  { href: '/timeline', label: 'Timeline', icon: History },
  { href: '/simulate', label: 'Scenario Lab', icon: FlaskConical },
  { href: '/graph', label: 'Workspace', icon: Share2 },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const LANDING_NAV = [
  { href: '/#features', label: 'Features' },
  { href: '/world', label: 'Knowledge' },
  { href: '/timeline', label: 'Timeline' },
];

interface SuggestionNode {
  id: string;
  name: string;
  type: string;
  description: string;
}

const ENTITY_NODES = (worldData.nodes as unknown as SuggestionNode[]) ?? [];
const MAX_SUGGESTIONS = 7;
const MIN_QUERY = 2;

function LogoMark({ size = 'h-2 w-2' }: { size?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(size, 'rounded-full bg-teal shadow-[0_0_10px_var(--teal)]')}
    />
  );
}

function Wordmark() {
  return (
    <Link href="/" aria-label="Genesis home" className="flex shrink-0 items-center gap-2.5">
      <LogoMark />
      <span className="text-sm font-medium tracking-[0.2em] text-ink">GENESIS</span>
    </Link>
  );
}

/**
 * GlobalSearch — Raycast-style instant entity search. Filters world.json
 * entities by name as the user types (min 2 chars), keyboard navigable
 * (ArrowUp/Down + Enter), Enter/click navigates to /entity/[id].
 */
function GlobalSearch({ id }: { id: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = `${id}-listbox`;

  const results = useMemo((): SuggestionNode[] => {
    const q = query.trim().toLowerCase();
    if (q.length < MIN_QUERY) return [];
    return ENTITY_NODES.filter((n) => n.name.toLowerCase().includes(q)).slice(
      0,
      MAX_SUGGESTIONS,
    );
  }, [query]);

  const expanded = open && query.trim().length >= MIN_QUERY;

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Close on outside pointer + Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e: PointerEvent): void => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  const go = (nodeId: string): void => {
    setOpen(false);
    setQuery('');
    router.push(`/entity/${nodeId}`);
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = results[active] ?? results[0];
      if (query.trim().length >= MIN_QUERY && hit) go(hit.id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-[520px]">
      <div className="search w-full">
        <Search size={16} aria-hidden="true" className="shrink-0" />
        <input
          id={id}
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            expanded && results[active] ? `opt-${id}-${results[active].id}` : undefined
          }
          aria-label="Search any topic"
          placeholder="Search any topic…"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0"
        />
      </div>

      <span aria-live="polite" className="sr-only">
        {expanded
          ? results.length === 0
            ? 'No matching entities'
            : `${results.length} suggestion${results.length === 1 ? '' : 's'}`
          : ''}
      </span>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: GENESIS_EASE }}
            className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          >
            {results.length > 0 ? (
              <ul id={listId} role="listbox" aria-label="Entity suggestions" className="py-2">
                {results.map((n, i) => (
                  <li key={n.id} role="option" id={`opt-${id}-${n.id}`} aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(n.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        i === active ? 'bg-teal/10' : 'bg-transparent',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{n.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {n.description}
                        </span>
                      </span>
                      <span className="tag shrink-0 capitalize">{n.type}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-3.5 text-sm text-muted">
                No entities match “{query.trim()}” yet.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Notification bell with an elegant empty dropdown. */
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e: PointerEvent): void => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  return (
    <div ref={boxRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        icon={<Bell size={18} aria-hidden="true" />}
      />
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: GENESIS_EASE }}
            className="glass absolute right-0 top-full z-50 mt-2 w-72"
          >
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/5">
                <Bell size={16} aria-hidden="true" className="text-muted" />
              </span>
              <p className="text-sm font-medium text-ink">No notifications yet</p>
              <p className="text-xs leading-relaxed text-muted">
                World updates and agent activity will appear here.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "AI Status" pill with a green pulsing dot. */
function AiStatusPill() {
  const reduceMotion = useReducedMotion();
  return (
    <span
      className="hidden items-center gap-2 rounded-full border border-line bg-white/5 px-3 py-1.5 text-xs text-muted lg:inline-flex"
      title="AI Status: all systems nominal"
    >
      <motion.span
        aria-hidden="true"
        className="h-2 w-2 rounded-full bg-teal shadow-[0_0_8px_var(--teal)]"
        animate={reduceMotion ? undefined : { opacity: [1, 0.35, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      AI Status
    </span>
  );
}

/** User avatar — placeholder account surface (auth is out of scope). */
function UserAvatar() {
  return (
    <span
      role="img"
      aria-label="Account (coming soon)"
      title="Account — coming soon"
      className="flex h-9 w-9 shrink-0 cursor-default items-center justify-center rounded-full border border-line bg-white/5 text-xs font-semibold tracking-wider text-ink backdrop-blur-md"
    >
      AP
    </span>
  );
}

/** "+ Generate World" gold CTA → /generator. Collapses to icon on small screens. */
function GenerateWorldButton() {
  const router = useRouter();
  return (
    <Button
      variant="primary"
      size="sm"
      aria-label="Generate World"
      onClick={() => router.push('/generator')}
      icon={<Plus size={14} aria-hidden="true" />}
      className="shrink-0"
    >
      <span className="hidden sm:inline">Generate World</span>
    </Button>
  );
}

/** Shared header bar. `variant="app"` keeps the full right cluster; landing keeps auth. */
function SiteHeader({ variant }: { variant: AppChrome }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-void/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Wordmark />
        <div className="flex min-w-0 flex-1 justify-center">
          <div className={cn('w-full', variant === 'landing' && 'hidden sm:block')}>
            <GlobalSearch id={variant === 'landing' ? 'landing-search' : 'global-search'} />
          </div>
        </div>
        {variant === 'app' ? (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <GenerateWorldButton />
            <ThemeToggle />
            <NotificationBell />
            <AiStatusPill />
            <UserAvatar />
          </div>
        ) : (
          <HeaderAuthActions />
        )}
      </div>
    </header>
  );
}

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

/** Log in / Sign up cluster for the landing header (auth stays a placeholder). */
function HeaderAuthActions() {
  const [sheet, setSheet] = useState<AuthSheet>(null);
  const close = (): void => setSheet(null);
  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
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
          className="max-[420px]:hidden"
        >
          Sign up
        </Button>
      </div>
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
    </>
  );
}

function LandingChrome({ title, children }: { title: string; children: React.ReactNode }) {
  const announcement = useWorldStore((s) => s.announcement);

  return (
    <div className="flex min-h-dvh flex-col bg-void text-ink">
      <SiteHeader variant="landing" />
      <nav aria-label={title} className="border-b border-line/40">
        <ul className="mx-auto hidden w-full max-w-[1440px] items-center gap-7 px-6 py-2.5 sm:flex">
          {LANDING_NAV.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                className="text-[13px] text-muted transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <main className="flex-1">{children}</main>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

function NavLinkItem({
  link,
  active,
  sizeClass = 'h-[42px] w-[42px]',
}: {
  link: NavLink;
  active: boolean;
  sizeClass?: string;
}) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      title={link.label}
      aria-label={link.label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center justify-center rounded-xl transition-colors',
        sizeClass,
        active
          ? 'bg-teal/10 text-teal shadow-[0_0_18px_color-mix(in_srgb,var(--teal)_28%,transparent)]'
          : 'text-muted hover:bg-teal/10 hover:text-teal',
      )}
    >
      <Icon size={20} aria-hidden="true" strokeWidth={1.5} />
    </Link>
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
        <Link href="/" title="Genesis home" aria-label="Genesis home" className="mb-4 flex items-center p-2">
          <LogoMark size="h-2.5 w-2.5" />
        </Link>
        {NAV_LINKS.map((link) => (
          <NavLinkItem key={link.href} link={link} active={isActive(link.href)} />
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader variant="app" />
        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10">
          <h1 className="sr-only">{title}</h1>
          {children}
        </main>
      </div>

      {/* Bottom bar — mobile */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-line/60 bg-void/85 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
      >
        {NAV_LINKS.map((link) => (
          <div key={link.href} className="flex flex-1 items-center justify-center">
            <NavLinkItem
              link={link}
              active={isActive(link.href)}
              sizeClass="h-[38px] w-[38px]"
            />
          </div>
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
 * chrome="landing": shared header (wordmark, entity search, Log in + Sign up
 * opening a placeholder auth sheet), plus the marketing link strip.
 * chrome="app": 72px icon rail (journey-ordered nav, teal-glow active state,
 * title-attr tooltips) + new header (wordmark, centered search as the primary
 * action, Generate World CTA, notification bell, AI Status pill, AP avatar);
 * rail collapses to a bottom bar on mobile.
 *
 * Always renders a <main> landmark and an aria-live polite region wired to
 * useWorldStore's announcement.
 */
export function AppShell({ children, chrome, title }: AppShellProps) {
  if (chrome === 'landing') {
    return <LandingChrome title={title}>{children}</LandingChrome>;
  }
  return <AppChrome title={title}>{children}</AppChrome>;
}
