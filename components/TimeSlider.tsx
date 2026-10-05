'use client';

interface TimeSliderProps {
  year: number;
  onChange: (year: number) => void;
}

const STOPS: { year: number; caption: string }[] = [
  { year: 2020, caption: 'GPT-3 and the scale bet' },
  { year: 2022, caption: 'the generative boom begins' },
  { year: 2024, caption: 'agents go mainstream' },
  { year: 2026, caption: 'the living ecosystem' },
];

export function TimeSlider({ year, onChange }: TimeSliderProps) {
  const activeCaption = STOPS.find((s) => s.year === year)?.caption ?? '';

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="group"
        aria-label="Time travel"
        className="flex items-center gap-1 rounded-full border border-line bg-surface/80 px-2 py-2 backdrop-blur-md"
      >
        {STOPS.map((stop) => {
          const isActive = stop.year === year;
          return (
            <button
              key={stop.year}
              type="button"
              aria-pressed={isActive}
              aria-label={`${stop.year} — ${stop.caption}`}
              onClick={() => onChange(stop.year)}
              className={`rounded-full px-4 py-1.5 font-mono text-[12px] transition-colors ${
                isActive
                  ? 'bg-gold text-void shadow-[0_0_12px_rgba(245,185,66,0.45)]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {stop.year}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="font-mono text-[11px] text-muted">
        {year} — {activeCaption}
      </p>
    </div>
  );
}
