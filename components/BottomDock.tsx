'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  FlaskConical,
  History,
  Lightbulb,
  NotebookPen,
  X,
  type LucideIcon,
} from 'lucide-react';
import { GENESIS_EASE } from '@/lib/motion';
import type { Discovery } from '@/lib/discovery';
import type { SimulateResponse, World } from '@/lib/types';

/**
 * BottomDock — Apple-style centered floating glass dock with five tool
 * sheets: Timeline, Simulation, Insights, Compare, Notes.
 *
 * Each button expands a glass sheet upward (max 60vh). Sheets fetch real
 * data: snapshots from /api/world/snapshot/[year], simulations via
 * POST /api/simulate, insight cards from lib/discovery, type counts from
 * the world prop. Filter/selection intents are dispatched as window
 * CustomEvents ('genesis:filter', 'genesis:select-node').
 */

type SheetKind = 'timeline' | 'simulation' | 'insights' | 'compare' | 'notes';

const SHEET_TITLES: Record<SheetKind, string> = {
  timeline: 'Timeline',
  simulation: 'Simulation',
  insights: 'Insights',
  compare: 'Compare',
  notes: 'Notes',
};

const DOCK_BUTTONS: { kind: SheetKind; label: string; Icon: LucideIcon }[] = [
  { kind: 'timeline', label: 'Timeline', Icon: History },
  { kind: 'simulation', label: 'Simulation', Icon: FlaskConical },
  { kind: 'insights', label: 'Insights', Icon: Lightbulb },
  { kind: 'compare', label: 'Compare', Icon: BarChart3 },
  { kind: 'notes', label: 'Notes', Icon: NotebookPen },
];

/* ------------------------------------------------------------------ */
/* Timeline sheet — snapshot scrubber over real /api/world snapshots.  */
/* ------------------------------------------------------------------ */

const SNAPSHOT_YEARS = ['2020', '2022', '2024', '2026'];

function TimelineSheet() {
  const [idx, setIdx] = useState(SNAPSHOT_YEARS.length - 1);
  const year = SNAPSHOT_YEARS[idx];
  const [counts, setCounts] = useState<{ nodes: number; edges: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetch(`/api/world/snapshot/${year}`)
      .then((r) => {
        if (!r.ok) throw new Error('snapshot unavailable');
        return r.json() as Promise<World>;
      })
      .then((w) => {
        if (!cancelled)
          setCounts({ nodes: w.nodes.length, edges: w.edges.length });
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setCounts(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {SNAPSHOT_YEARS.map((y, i) => (
          <button
            key={y}
            type="button"
            onClick={() => setIdx(i)}
            aria-pressed={i === idx}
            className={`ghost${i === idx ? ' on' : ''}`}
          >
            {y}
          </button>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={SNAPSHOT_YEARS.length - 1}
        step={1}
        value={idx}
        onChange={(e) => setIdx(Number(e.target.value))}
        aria-label="Snapshot year scrubber"
      />
      <div
        aria-live="polite"
        style={{ display: 'flex', gap: 24, marginTop: 16 }}
      >
        {loading && <span className="mut">Loading snapshot…</span>}
        {failed && <span style={{ color: 'var(--red)' }}>Snapshot unavailable.</span>}
        {counts && !loading && (
          <>
            <div>
              <div className="big">{counts.nodes}</div>
              <div className="mut" style={{ fontSize: 12 }}>
                entities in {year}
              </div>
            </div>
            <div>
              <div className="big">{counts.edges}</div>
              <div className="mut" style={{ fontSize: 12 }}>
                relations in {year}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Simulation sheet — POST /api/simulate, SIMULATION-labeled output.   */
/* ------------------------------------------------------------------ */

type SimResult = SimulateResponse | { error: string; label?: string };

function SimulationSheet() {
  const [scenario, setScenario] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);

  const run = useCallback(async () => {
    const text = scenario.trim();
    if (!text || running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: text }),
      });
      const data = (await res.json()) as SimResult;
      setResult(data);
    } catch {
      setResult({ error: 'Simulation request failed. Please try again.' });
    } finally {
      setRunning(false);
    }
  }, [scenario, running]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run();
          }}
          placeholder="e.g. What if open-source models overtake closed ones?"
          aria-label="Simulation scenario"
          className="search"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={running || scenario.trim() === ''}
          className="gold"
          style={{ padding: '10px 20px' }}
        >
          {running ? 'Running…' : 'Run'}
        </button>
      </div>

      {running && <span className="mut">Running simulation…</span>}

      {result && 'error' in result && (
        <div aria-live="polite">
          {result.label && (
            <div className="tag" style={{ color: 'var(--amber)', borderColor: 'var(--amber)', marginBottom: 8, display: 'inline-block' }}>
              SIMULATION
            </div>
          )}
          <p style={{ color: 'var(--red)', fontSize: 14 }}>{result.error}</p>
        </div>
      )}

      {result && !('error' in result) && (
        <div aria-live="polite">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            <span
              className="tag"
              style={{ color: 'var(--amber)', borderColor: 'var(--amber)' }}
            >
              SIMULATION
            </span>
            <span className="mut mono" style={{ fontSize: 11 }}>
              isSimulation: true
            </span>
          </div>
          <p className="mut" style={{ fontSize: 12, marginBottom: 8 }}>
            {result.label}
          </p>
          <h4 style={{ fontSize: 15, margin: '0 0 8px', color: 'var(--cream)' }}>
            {result.scenario}
          </h4>
          {result.affected.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {result.affected.map((a) => (
                <span key={a} className="tag">
                  {a}
                </span>
              ))}
            </div>
          )}
          {result.cascades.map((c) => (
            <div className="row" key={c.nodeId}>
              <span style={{ fontSize: 13 }}>{c.effect}</span>
              <span className="tag">{c.severity}</span>
            </div>
          ))}
          {result.note && (
            <p className="mut" style={{ fontSize: 12, marginTop: 8 }}>
              {result.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Insights sheet — dynamic import of lib/discovery with fallback.     */
/* ------------------------------------------------------------------ */

function InsightsSheet({ world }: { world: World }) {
  const [cards, setCards] = useState<Discovery[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('@/lib/discovery');
        if (!cancelled) setCards(mod.getDiscoveries(world));
      } catch {
        if (!cancelled) setCards(null); // stays null → placeholder
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [world]);

  const explore = (d: Discovery) => {
    if ('nodeId' in d.filter) {
      window.dispatchEvent(
        new CustomEvent('genesis:select-node', { detail: { nodeId: d.filter.nodeId } }),
      );
    } else if (d.filter.categories) {
      window.dispatchEvent(
        new CustomEvent('genesis:filter', {
          detail: { categories: d.filter.categories },
        }),
      );
    }
  };

  if (cards === null) {
    return <p className="mut">Insights computing…</p>;
  }
  if (cards.length === 0) {
    return <p className="mut">No insights available for this world yet.</p>;
  }

  const kindColor: Record<Discovery['kind'], string> = {
    insight: 'var(--teal)',
    risk: 'var(--red)',
    trend: 'var(--amber)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {cards.map((d) => (
        <article
          key={d.id}
          style={{
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 14,
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <span
              className="tag"
              style={{ color: kindColor[d.kind], borderColor: kindColor[d.kind] }}
            >
              {d.kind}
            </span>
            {d.estimated && <span className="tag">estimate</span>}
          </div>
          <h4 style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--cream)' }}>
            {d.title}
          </h4>
          <p className="mut" style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 10px' }}>
            {d.detail}
          </p>
          <button
            type="button"
            onClick={() => explore(d)}
            className="ghost"
            style={{ fontSize: 12 }}
          >
            {d.actionLabel || 'Explore'}
          </button>
        </article>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compare sheet — top-6 entity types by real node count.              */
/* ------------------------------------------------------------------ */

function CompareSheet({ world }: { world: World }) {
  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of world.nodes ?? []) {
      counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [world]);

  const max = rows[0]?.[1] ?? 1;

  if (rows.length === 0) {
    return <p className="mut">No entities to compare yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(([type, count]) => (
        <button
          key={type}
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('genesis:filter', {
                detail: { categories: [type] },
              }),
            )
          }
          aria-label={`Filter to ${type} entities (${count})`}
          style={{
            background: 'none',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            font: 'inherit',
            color: 'var(--cream)',
            textAlign: 'left',
            display: 'block',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            <span style={{ textTransform: 'capitalize' }}>{type}</span>
            <span className="mono" style={{ color: 'var(--mut)' }}>
              {count}
            </span>
          </div>
          <div className="bar" role="img" aria-label={`${type}: ${count} entities`}>
            <i style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </button>
      ))}
      <p className="mut" style={{ fontSize: 12, marginTop: 4 }}>
        Select a type to filter the world.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notes sheet — textarea persisted to localStorage with word count.   */
/* ------------------------------------------------------------------ */

function NotesSheet() {
  const [notes, setNotes] = useState<string>(() => {
    try {
      return typeof window === 'undefined'
        ? ''
        : (localStorage.getItem('genesis-notes') ?? '');
    } catch {
      return '';
    }
  });

  const persist = (value: string) => {
    setNotes(value);
    try {
      localStorage.setItem('genesis-notes', value);
    } catch {
      // storage unavailable — notes still work for this session
    }
  };

  const words = notes.trim() === '' ? 0 : notes.trim().split(/\s+/).length;

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => persist(e.target.value)}
        placeholder="Field notes on this world…"
        aria-label="World notes"
        rows={6}
      />
      <div
        className="mono mut"
        aria-live="polite"
        style={{ fontSize: 12, marginTop: 8, textAlign: 'right' }}
      >
        {words} {words === 1 ? 'word' : 'words'}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The dock itself.                                                    */
/* ------------------------------------------------------------------ */

export function BottomDock({ world }: { world: World }) {
  const reduced = useReducedMotion() ?? false;
  const [sheet, setSheet] = useState<SheetKind | null>(null);

  const triggerRefs = useRef<Record<SheetKind, HTMLButtonElement | null>>({
    timeline: null,
    simulation: null,
    insights: null,
    compare: null,
    notes: null,
  });
  const sheetCloseRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<SheetKind | null>(null);
  sheetRef.current = sheet;

  const closeSheet = useCallback((kind: SheetKind | null) => {
    setSheet(null);
    if (kind) triggerRefs.current[kind]?.focus();
  }, []);

  const toggle = useCallback(
    (kind: SheetKind) => {
      if (sheetRef.current === kind) {
        closeSheet(kind);
      } else {
        setSheet(kind);
      }
    },
    [closeSheet],
  );

  // Escape closes the open sheet and returns focus to its trigger.
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet(sheetRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, closeSheet]);

  // Move focus into the sheet once it opens.
  useEffect(() => {
    if (!sheet) return;
    const t = window.setTimeout(
      () => sheetCloseRef.current?.focus(),
      reduced ? 0 : 220,
    );
    return () => window.clearTimeout(t);
  }, [sheet, reduced]);

  return (
    <>
      <AnimatePresence>
        {sheet && (
          <motion.div
            key="dock-sheet"
            role="dialog"
            aria-label={SHEET_TITLES[sheet]}
            className="glass"
            initial={{ y: reduced ? 0 : 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reduced ? 0 : 24, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: GENESIS_EASE }}
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 96,
              zIndex: 45,
              width: 'min(640px, calc(100vw - 32px))',
              maxHeight: '60vh',
              overflowY: 'auto',
              padding: 20,
              x: '-50%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                {SHEET_TITLES[sheet]}
              </h3>
              <button
                ref={sheetCloseRef}
                type="button"
                onClick={() => closeSheet(sheet)}
                aria-label={`Close ${SHEET_TITLES[sheet]}`}
                className="ghost"
                style={{ padding: 8 }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {sheet === 'timeline' && <TimelineSheet />}
            {sheet === 'simulation' && <SimulationSheet />}
            {sheet === 'insights' && <InsightsSheet world={world} />}
            {sheet === 'compare' && <CompareSheet world={world} />}
            {sheet === 'notes' && <NotesSheet />}
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        aria-label="World tools"
        className="glass"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 16,
          transform: 'translateX(-50%)',
          zIndex: 44,
          display: 'flex',
          gap: 4,
          padding: '8px 12px',
          borderRadius: 999,
          maxWidth: 'calc(100vw - 24px)',
          overflowX: 'auto',
        }}
      >
        {DOCK_BUTTONS.map(({ kind, label, Icon }) => {
          const isActive = sheet === kind;
          return (
            <button
              key={kind}
              ref={(el) => {
                triggerRefs.current[kind] = el;
              }}
              type="button"
              onClick={() => toggle(kind)}
              aria-label={label}
              aria-expanded={isActive}
              title={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '1px solid transparent',
                background: isActive ? 'color-mix(in srgb, var(--teal) 12%, transparent)' : 'transparent',
                borderColor: isActive ? 'var(--teal)' : 'transparent',
                color: isActive ? 'var(--teal)' : 'var(--mut)',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'color 0.18s ease, background 0.18s ease, border-color 0.18s ease',
              }}
            >
              <Icon size={20} aria-hidden="true" />
            </button>
          );
        })}
      </nav>
    </>
  );
}
