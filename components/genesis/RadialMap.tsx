'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { BuildAnswer, BuildEntity, EntityGroup } from '@/lib/build';

export const GROUP_COLORS: Record<EntityGroup, string> = {
  Companies: '#14b8a6',
  Models: '#f59e0b',
  People: '#ec4899',
  Hardware: '#8b5cf6',
  Ideas: '#3b82f6',
};

const GROUP_ORDER: EntityGroup[] = ['Companies', 'Models', 'People', 'Hardware', 'Ideas'];
/** Degrees, 0 = east, clockwise (SVG y-down). Matches the Figma layout. */
const GROUP_ANGLES: Record<EntityGroup, number> = {
  Companies: 270,
  Models: 340,
  People: 70,
  Hardware: 140,
  Ideas: 205,
};

const CX = 280;
const CY = 225;
const GROUP_R = 128;
const ENTITY_R = 208;

interface Placed {
  entity: BuildEntity;
  x: number;
  y: number;
  group: EntityGroup;
  isGroup: boolean;
}

function polar(angleDeg: number, r: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function Shape({
  group,
  x,
  y,
  size,
  selected,
  dimmed,
  onClick,
}: {
  group: EntityGroup;
  x: number;
  y: number;
  size: number;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const c = GROUP_COLORS[group];
  const opacity = dimmed ? 0.25 : 1;
  const common = {
    className: 'qa-map-node',
    onClick,
    opacity,
    style: { cursor: 'pointer' } as const,
  };
  const ring = selected ? (
    <circle cx={x} cy={y} r={size + 6} fill="none" stroke={c} strokeWidth={2.5} opacity={0.6} />
  ) : null;
  switch (group) {
    case 'Companies':
      return (
        <g {...common}>
          {ring}
          <rect x={x - size} y={y - size} width={size * 2} height={size * 2} rx={size * 0.45} fill={c} />
        </g>
      );
    case 'Models':
      return (
        <g {...common}>
          {ring}
          <circle cx={x} cy={y} r={size} fill={c} />
        </g>
      );
    case 'People':
      return (
        <g {...common}>
          {ring}
          <polygon points={`${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`} fill={c} />
        </g>
      );
    case 'Hardware': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        return `${x + size * Math.cos(a)},${y + size * Math.sin(a)}`;
      }).join(' ');
      return (
        <g {...common}>
          {ring}
          <polygon points={pts} fill={c} />
        </g>
      );
    }
    case 'Ideas':
      return (
        <g {...common}>
          {ring}
          <polygon points={`${x},${y - size} ${x + size * 0.95},${y + size * 0.75} ${x - size * 0.95},${y + size * 0.75}`} fill={c} />
        </g>
      );
  }
}

/**
 * Figma "See how it connects": radial SVG knowledge map. Centre node,
 * five shape-coded groups, entity nodes fanned around their group, real
 * links drawn as lines, legend below. Tap a shape for the detail card.
 */
export function RadialMap({ answer, onSeeSources }: { answer: BuildAnswer; onSeeSources: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<EntityGroup | null>(null);

  const placed = useMemo<Placed[]>(() => {
    const byGroup = new Map<EntityGroup, BuildEntity[]>();
    for (const e of answer.entities) {
      const list = byGroup.get(e.group) ?? [];
      if (list.length < 4) list.push(e);
      byGroup.set(e.group, list);
    }
    const out: Placed[] = [];
    for (const g of GROUP_ORDER) {
      const gp = polar(GROUP_ANGLES[g], GROUP_R);
      out.push({
        entity: { name: g, group: g, description: '' },
        x: gp.x,
        y: gp.y,
        group: g,
        isGroup: true,
      });
      const list = byGroup.get(g) ?? [];
      list.forEach((e, i) => {
        const spread = list.length === 1 ? 0 : (i - (list.length - 1) / 2) * 26;
        const ep = polar(GROUP_ANGLES[g] + spread, ENTITY_R);
        out.push({ entity: e, x: ep.x, y: ep.y, group: g, isGroup: false });
      });
    }
    return out;
  }, [answer.entities]);

  const posOf = useMemo(() => {
    const m = new Map<string, Placed>();
    for (const p of placed) m.set(p.entity.name, p);
    return m;
  }, [placed]);

  if (answer.entities.length === 0) {
    return (
      <section className="qa-card" aria-label="See how it connects">
        <h2>See how it connects</h2>
        <div className="qa-map-empty">
          <p>
            The entity map appears when the AI summary is on. Your answer above is built directly
            from the sources — open them to explore every connection yourself.
          </p>
          <button type="button" className="qa-pill-btn ghost" onClick={onSeeSources}>
            See the sources
          </button>
        </div>
      </section>
    );
  }

  const selectedEntity = selected ? posOf.get(selected)?.entity ?? null : null;
  const selectedLinks = selected
    ? answer.links.filter((l) => l.from === selected || l.to === selected)
    : [];

  return (
    <section className="qa-card" aria-label="See how it connects">
      <h2>See how it connects</h2>
      <p className="hint">Tap any shape to learn more about it.</p>
      <div className="qa-map-wrap">
        <svg className="qa-map-svg" viewBox="0 0 560 450" role="img" aria-label="Entity connection map">
          {/* links */}
          {answer.links.map((l, i) => {
            const a = posOf.get(l.from);
            const b = posOf.get(l.to);
            if (!a || !b) return null;
            const dim = highlight && a.group !== highlight && b.group !== highlight;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#b9c2d4"
                strokeWidth={1.4}
                opacity={dim ? 0.15 : 0.75}
              >
                <title>{l.reason}</title>
              </line>
            );
          })}
          {/* group -> entity spokes */}
          {placed
            .filter((p) => !p.isGroup)
            .map((p) => {
              const g = placed.find((q) => q.isGroup && q.group === p.group);
              if (!g) return null;
              const dim = highlight && p.group !== highlight;
              return (
                <line
                  key={`spoke-${p.entity.name}`}
                  x1={g.x}
                  y1={g.y}
                  x2={p.x}
                  y2={p.y}
                  stroke={GROUP_COLORS[p.group]}
                  strokeWidth={1.6}
                  opacity={dim ? 0.12 : 0.55}
                />
              );
            })}
          {/* centre */}
          <g>
            <circle cx={CX} cy={CY} r={34} fill="#14b8a6" />
            <text x={CX} y={CY - 2} textAnchor="middle" fontSize={12.5} fontWeight={800} fill="#fff">
              The AI
            </text>
            <text x={CX} y={CY + 13} textAnchor="middle" fontSize={12.5} fontWeight={800} fill="#fff">
              world
            </text>
          </g>
          {/* nodes */}
          {placed.map((p) => (
            <g key={p.entity.name}>
              <Shape
                group={p.group}
                x={p.x}
                y={p.y}
                size={p.isGroup ? 24 : 13}
                selected={selected === p.entity.name}
                dimmed={!!highlight && p.group !== highlight}
                onClick={() => setSelected((s) => (s === p.entity.name ? null : p.entity.name))}
              />
              <text
                x={p.x}
                y={p.y + (p.isGroup ? 40 : 26)}
                textAnchor="middle"
                fontSize={p.isGroup ? 13 : 11.5}
                fontWeight={p.isGroup ? 800 : 600}
                fill="#1c2742"
                opacity={highlight && p.group !== highlight ? 0.25 : 1}
              >
                {p.entity.name.length > 16 ? `${p.entity.name.slice(0, 15)}…` : p.entity.name}
              </text>
            </g>
          ))}
        </svg>

        {selectedEntity && !posOf.get(selectedEntity.name)?.isGroup && (
          <aside className="qa-entity-card" aria-label={`${selectedEntity.name} details`}>
            <button type="button" className="close" onClick={() => setSelected(null)} aria-label="Close details">
              <X size={14} />
            </button>
            <span className="g" style={{ background: GROUP_COLORS[selectedEntity.group] }}>
              {selectedEntity.group}
            </span>
            <h3>{selectedEntity.name}</h3>
            <p>{selectedEntity.description}</p>
            {selectedLinks.length > 0 && (
              <div>
                {selectedLinks.slice(0, 3).map((l, i) => (
                  <p key={i} style={{ fontSize: 12.5, marginBottom: 6 }}>
                    <strong>{l.from === selected ? l.to : l.from}</strong> — {l.reason}
                  </p>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      <div className="qa-map-legend">
        <span className="k">Key:</span>
        {GROUP_ORDER.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setHighlight((h) => (h === g ? null : g))}
            style={{
              border: 0,
              background: 'transparent',
              font: 'inherit',
              color: 'inherit',
              fontWeight: 600,
              opacity: highlight && highlight !== g ? 0.4 : 1,
            }}
            aria-pressed={highlight === g}
            title={`Highlight ${g}`}
          >
            <span className="sw" style={{ background: GROUP_COLORS[g], borderRadius: g === 'Models' ? '50%' : 3 }} />
            {g}
          </button>
        ))}
        <span style={{ color: '#8a93a8' }}>Line = connected</span>
      </div>
    </section>
  );
}
