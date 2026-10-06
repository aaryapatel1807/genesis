'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ExternalLink, Minus, X } from 'lucide-react';
import { GENESIS_EASE } from '@/lib/motion';
import type { GEdge, World } from '@/lib/types';
import worldJson from '@/data/world.json';

/**
 * EntityInspector — right-side slide-in inspector for a single world entity.
 *
 * Reads data/world.json directly and renders the node for `nodeId`.
 * Tabs: Overview, Timeline, Evidence, Connections, Sources, Simulation.
 *
 * Connections dispatch `genesis:select-node` (and close the panel).
 * The Simulation tab is a topology-based ESTIMATE only — never a prediction.
 */

const world = worldJson as unknown as World;

const TABS = [
  'Overview',
  'Timeline',
  'Evidence',
  'Connections',
  'Sources',
  'Simulation',
] as const;

type Tab = (typeof TABS)[number];

const SNAPSHOT_YEARS = [2020, 2022, 2024, 2026] as const;

function nodeInSnapshot(firstSeen: string, year: number): boolean {
  const seen = parseInt(firstSeen.slice(0, 4), 10);
  return Number.isFinite(seen) && seen <= year;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function EntityInspector({
  nodeId,
  onClose,
}: {
  nodeId: string | null;
  onClose: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<Tab>('Overview');

  const node = useMemo(
    () => (nodeId ? world.nodes.find((n) => n.id === nodeId) ?? null : null),
    [nodeId],
  );

  const touching: GEdge[] = useMemo(
    () =>
      node
        ? world.edges.filter((e) => e.source === node.id || e.target === node.id)
        : [],
    [node],
  );

  const neighbors = useMemo(() => {
    if (!node) return [];
    const seen = new Set<string>();
    const out: { id: string; name: string; type: string; relation: string }[] = [];
    for (const e of touching) {
      const otherId = e.source === node.id ? e.target : e.source;
      if (seen.has(otherId)) continue;
      seen.add(otherId);
      const other = world.nodes.find((n) => n.id === otherId);
      if (other) {
        out.push({
          id: other.id,
          name: other.name,
          type: other.type,
          relation: e.relation,
        });
      }
    }
    return out;
  }, [node, touching]);

  const sources = useMemo(() => {
    const urls = new Set<string>();
    for (const e of touching) {
      for (const ev of e.evidence ?? []) {
        if (ev.url) urls.add(ev.url);
      }
    }
    return [...urls];
  }, [touching]);

  // Reset to the first tab and focus the close button each time a node opens.
  useEffect(() => {
    if (nodeId) {
      setTab('Overview');
      closeRef.current?.focus();
    }
  }, [nodeId]);

  // Escape closes.
  useEffect(() => {
    if (!nodeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nodeId, onClose]);

  const confidence = node?.reality.confidence ?? 0;

  // "Remove this node" estimate — pure graph topology, labeled ESTIMATE.
  const edgeShare =
    world.edges.length > 0 ? (touching.length / world.edges.length) * 100 : 0;

  const selectNeighbor = (id: string) => {
    window.dispatchEvent(
      new CustomEvent('genesis:select-node', { detail: { nodeId: id } }),
    );
    onClose();
  };

  return (
    <AnimatePresence>
      {nodeId && node && (
        <motion.aside
          key={node.id}
          role="dialog"
          aria-modal="true"
          aria-label={`${node.name} inspector`}
          className="glass"
          initial={{ x: reduced ? 0 : 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: reduced ? 0 : 60, opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.3, ease: GENESIS_EASE }}
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            bottom: 16,
            width: 'min(420px, calc(100vw - 32px))',
            zIndex: 50,
            overflowY: 'auto',
            padding: 20,
          }}
        >
          {/* Profile header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 4,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {node.name}
              </h2>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="tag">{node.type}</span>
                <span className="tag">first seen {node.first_seen}</span>
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={`Close inspector for ${node.name}`}
              className="ghost"
              style={{ padding: 8, flexShrink: 0 }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="row">
            <span className="mut">Influence</span>
            <span className="big" style={{ fontSize: 26 }}>
              {node.influence}
            </span>
          </div>
          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <div
              className="mut"
              style={{ fontSize: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}
            >
              <span>Confidence</span>
              <span className="mono">{confidence}%</span>
            </div>
            <div className="bar" role="progressbar" aria-valuenow={confidence} aria-valuemin={0} aria-valuemax={100} aria-label="Confidence">
              <i style={{ width: `${confidence}%` }} />
            </div>
          </div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label={`${node.name} details`}
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                id={`ei-tab-${t}`}
                aria-selected={tab === t}
                aria-controls={`ei-panel-${t}`}
                onClick={() => setTab(t)}
                className={`ghost${tab === t ? ' on' : ''}`}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                {t}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`ei-panel-${tab}`} aria-labelledby={`ei-tab-${tab}`}>
            {tab === 'Overview' && (
              <div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--cream)' }}>
                  {node.description}
                </p>
                <div style={{ marginTop: 12 }}>
                  <div className="row">
                    <span className="mut">First seen</span>
                    <span>{node.first_seen}</span>
                  </div>
                  <div className="row">
                    <span className="mut">Freshness</span>
                    <span>{node.reality.freshness}</span>
                  </div>
                  <div className="row">
                    <span className="mut">Sources</span>
                    <span>{node.reality.sources}</span>
                  </div>
                  <div className="row">
                    <span className="mut">Relations</span>
                    <span>{touching.length}</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'Timeline' && (
              <div>
                <p className="mut" style={{ fontSize: 13, marginBottom: 12 }}>
                  Snapshots that include this entity (first seen {node.first_seen}):
                </p>
                {SNAPSHOT_YEARS.map((year) => {
                  const included = nodeInSnapshot(node.first_seen, year);
                  return (
                    <div className="row" key={year}>
                      <span>{year} snapshot</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: included ? 'var(--teal)' : 'var(--mut)',
                          fontSize: 13,
                        }}
                      >
                        {included ? (
                          <Check size={14} aria-hidden="true" />
                        ) : (
                          <Minus size={14} aria-hidden="true" />
                        )}
                        {included ? 'Present' : 'Not yet seen'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'Evidence' && (
              <div>
                {touching.length === 0 && (
                  <p className="mut" style={{ fontSize: 13 }}>
                    No recorded relations.
                  </p>
                )}
                {touching.map((e) => (
                  <div key={e.id} style={{ marginBottom: 16 }}>
                    <div
                      className="mono"
                      style={{ fontSize: 12, color: 'var(--teal)', marginBottom: 8 }}
                    >
                      {e.relation} · {e.strength}
                    </div>
                    {(e.evidence ?? []).map((ev, i) => (
                      <div
                        key={`${e.id}-${i}`}
                        style={{
                          borderLeft: '2px solid var(--line)',
                          paddingLeft: 12,
                          marginBottom: 10,
                        }}
                      >
                        <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 6px' }}>
                          “{ev.snippet}”
                        </p>
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 12,
                            color: 'var(--amber)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {hostOf(ev.url)}
                          <ExternalLink size={12} aria-hidden="true" />
                        </a>
                        <div className="mut mono" style={{ fontSize: 11, marginTop: 4 }}>
                          {ev.engine} · {ev.date}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {tab === 'Connections' && (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {neighbors.length === 0 && (
                  <p className="mut" style={{ fontSize: 13 }}>
                    No recorded relations.
                  </p>
                )}
                {neighbors.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => selectNeighbor(n.id)}
                    className="ghost"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      textAlign: 'left',
                      borderRadius: 12,
                      padding: '10px 14px',
                    }}
                    aria-label={`Inspect ${n.name}`}
                  >
                    <span>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>
                        {n.name}
                      </span>
                      <span className="mut" style={{ fontSize: 12 }}>
                        {n.type} · {n.relation}
                      </span>
                    </span>
                    <ExternalLink size={14} aria-hidden="true" style={{ color: 'var(--mut)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}

            {tab === 'Sources' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sources.length === 0 && (
                  <p className="mut" style={{ fontSize: 13 }}>
                    No sources recorded.
                  </p>
                )}
                {sources.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 13,
                      color: 'var(--cream)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      wordBreak: 'break-all',
                    }}
                  >
                    <ExternalLink size={13} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--amber)' }} />
                    {url}
                  </a>
                ))}
              </div>
            )}

            {tab === 'Simulation' && (
              <div>
                <div
                  className="tag"
                  style={{
                    color: 'var(--amber)',
                    borderColor: 'var(--amber)',
                    marginBottom: 12,
                    display: 'inline-block',
                  }}
                >
                  ESTIMATE — never a prediction
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7 }}>
                  Removing <strong>{node.name}</strong> would touch{' '}
                  <strong className="teal">{touching.length}</strong> of{' '}
                  {world.edges.length} relations (
                  {edgeShare.toFixed(1)}% of the graph&apos;s edges) and
                  disconnect <strong className="teal">{neighbors.length}</strong>{' '}
                  directly connected {neighbors.length === 1 ? 'entity' : 'entities'}.
                </p>
                <p className="mut" style={{ fontSize: 12, lineHeight: 1.7, marginTop: 12 }}>
                  ESTIMATE: derived purely from graph topology (degree share).
                  It is a structural heuristic — not a forecast of real-world
                  impact, and never a prediction.
                </p>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
