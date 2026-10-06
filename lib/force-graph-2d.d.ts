// lib/force-graph-2d.d.ts
// Minimal typed surface for react-force-graph-2d covering exactly what
// UniverseGraph uses. Keeps `tsc --noEmit` honest without extra @types deps.

declare module 'react-force-graph-2d' {
  import type * as React from 'react';

  export interface ForceGraph2DMethods {
    centerAt(x: number, y: number, ms?: number): void;
    zoom(k: number, ms?: number): number;
    zoomToFit(ms?: number, padding?: number): void;
    refresh(): void;
    /**
     * d3 force accessors (force-graph). `d3Force(name)` returns the live
     * force instance for tuning; `d3Force(name, fn)` registers a new one
     * (d3 forces are callable, hence the function type).
     */
    d3Force(
      forceName: string,
      forceFn?: (alpha: number) => void,
    ): D3ForceTunable | undefined;
    d3ReheatSimulation(): void;
    graphData(): { nodes: ForceGraphNode[]; links: ForceGraphLink[] };
  }

  /** Minimal surface of a d3 force instance — only what UniverseGraph tunes. */
  export interface D3ForceTunable {
    strength(value: number | ((d: any) => number)): D3ForceTunable;
    distanceMax(value: number): D3ForceTunable;
    distance(value: number | ((link: any) => number)): D3ForceTunable;
  }

  export interface ForceGraphNode {
    id?: string | number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number;
    fy?: number;
  }

  export interface ForceGraphLink {
    source?: string | number | ForceGraphNode;
    target?: string | number | ForceGraphNode;
  }

  export interface ForceGraph2DProps {
    graphData?: { nodes: ForceGraphNode[]; links: ForceGraphLink[] };
    nodeId?: string;
    linkSource?: string;
    linkTarget?: string;
    nodeLabel?: string | ((node: ForceGraphNode) => string);
    linkLabel?: string | ((link: ForceGraphLink) => string);
    nodeCanvasObject?: (
      node: ForceGraphNode,
      ctx: CanvasRenderingContext2D,
      globalScale: number,
    ) => void;
    linkCanvasObject?: (
      link: ForceGraphLink,
      ctx: CanvasRenderingContext2D,
      globalScale: number,
    ) => void;
    onNodeClick?: (node: ForceGraphNode, event: MouseEvent) => void;
    onLinkClick?: (link: ForceGraphLink, event: MouseEvent) => void;
    onNodeHover?: (node: ForceGraphNode | null) => void;
    onNodeDragEnd?: (node: ForceGraphNode) => void;
    onBackgroundClick?: (event: MouseEvent) => void;
    backgroundColor?: string;
    width?: number;
    height?: number;
    enableZoomPanInteraction?: boolean;
    enableNodeDrag?: boolean;
    cooldownTime?: number;
    d3AlphaDecay?: number;
    d3VelocityDecay?: number;
    warmupTicks?: number;
    /** Fired when the d3 engine cools down — used to snapshot positions. */
    onEngineStop?: () => void;
  }

  const ForceGraph2D: React.ForwardRefExoticComponent<
    ForceGraph2DProps & React.RefAttributes<ForceGraph2DMethods>
  >;
  export default ForceGraph2D;
}
