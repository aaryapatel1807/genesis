'use client';

import { LAYER_ORDER, type Layer } from '@/lib/types';

interface LayerBarProps {
  active: Set<Layer>;
  onToggle: (layer: Layer) => void;
}

export function LayerBar({ active, onToggle }: LayerBarProps) {
  return (
    <div
      role="group"
      aria-label="Knowledge layers"
      className="flex max-w-[70vw] gap-2 overflow-x-auto rounded-full border border-line bg-surface/80 px-2 py-2 backdrop-blur-md"
    >
      {LAYER_ORDER.map((layer) => {
        const isActive = active.has(layer);
        return (
          <button
            key={layer}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(layer)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors ${
              isActive
                ? 'bg-gold/15 text-gold shadow-[0_0_12px_rgba(245,185,66,0.35)]'
                : 'text-muted hover:text-ink'
            }`}
          >
            {layer}
          </button>
        );
      })}
    </div>
  );
}
