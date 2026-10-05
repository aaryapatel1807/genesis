'use client';

import { useEffect, useRef } from 'react';

/**
 * AmbientField — the living backdrop behind the landing hero.
 * Matches the approved landing mockup: a faint drifting network of glowing
 * nodes (teal / gold / violet / blue) with soft connecting filaments.
 *
 * Performance: single canvas, ~90 nodes, rAF loop, DPR-aware, pauses when
 * the tab is hidden. Reduced motion: renders one static frame.
 */

const NODE_COUNT = 90;
const LINK_DIST = 130;
const PALETTE = ['#2dd4bf', '#f5b942', '#a78bfa', '#5aa9ff', '#4ade80'];

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  glow: number;
}

function makeDots(w: number, h: number): Dot[] {
  const dots: Dot[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const big = Math.random() < 0.12;
    dots.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: big ? 3.2 + Math.random() * 2.4 : 1 + Math.random() * 1.4,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)] as string,
      glow: big ? 14 : 6,
    });
  }
  return dots;
}

export function AmbientField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dots: Dot[] = [];
    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      dots = makeDots(rect.width, rect.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (): void => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Filaments
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i] as Dot;
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j] as Dot;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.16;
            ctx.strokeStyle = `rgba(139,152,171,${alpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Nodes
      for (const d of dots) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = d.glow;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const step = (): void => {
      if (!running) return;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -20) d.x = w + 20;
        if (d.x > w + 20) d.x = -20;
        if (d.y < -20) d.y = h + 20;
        if (d.y > h + 20) d.y = -20;
      }
      draw();
      raf = requestAnimationFrame(step);
    };

    const onVisibility = (): void => {
      running = !document.hidden;
      if (running && !reduced) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(step);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    draw(); // first frame immediately (also the only frame when reduced)
    if (!reduced) raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? 'pointer-events-none absolute inset-0 h-full w-full opacity-70'}
    />
  );
}
