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
  }

  const ForceGraph2D: React.ForwardRefExoticComponent<
    ForceGraph2DProps & React.RefAttributes<ForceGraph2DMethods>
  >;
  export default ForceGraph2D;
}
