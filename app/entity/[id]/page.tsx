import { promises as fs } from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import type { GEdge, GNode, World } from '@/lib/types';
import { EntityView } from './EntityView';
import type {
  EntityVM,
  EventRowVM,
  EvidenceTileVM,
  NeighborVM,
} from './EntityView';

async function loadWorld(): Promise<World> {
  const raw = await fs.readFile(
    path.join(process.cwd(), 'data', 'world.json'),
    'utf8',
  );
  return JSON.parse(raw) as World;
}

export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  const world = await loadWorld();
  return world.nodes.map((node) => ({ id: node.id }));
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1] ?? m[2];
  return `${month} ${m[3]}, ${m[1]}`;
}

function otherId(edge: GEdge, id: string): string {
  return edge.source === id ? edge.target : edge.source;
}

interface EntityPageParams {
  params: { id: string };
}

export default async function EntityPage({
  params,
}: EntityPageParams): Promise<React.JSX.Element> {
  const world = await loadWorld();
  const node = world.nodes.find((n) => n.id === params.id);
  if (!node) notFound();

  const touching = world.edges.filter(
    (e) => e.source === node.id || e.target === node.id,
  );
  const byId = new Map<string, GNode>(world.nodes.map((n) => [n.id, n]));
  const otherName = (edge: GEdge): string =>
    byId.get(otherId(edge, node.id))?.name ?? otherId(edge, node.id);

  const evidence: EvidenceTileVM[] = touching
    .flatMap((edge) =>
      edge.evidence.map((ev) => ({
        snippet: ev.snippet,
        url: ev.url,
        engine: ev.engine,
        dateDisplay: fmtDate(ev.date),
        dateISO: ev.date,
        relation: edge.relation,
        otherName: otherName(edge),
      })),
    )
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const events: EventRowVM[] = touching
    .map((edge) => {
      const dates = edge.evidence
        .map((ev) => ev.date)
        .filter(Boolean)
        .sort();
      const first = dates[0] ?? '';
      return {
        key: edge.id,
        dateDisplay: first ? fmtDate(first) : '',
        dateISO: first,
        relation: edge.relation,
        otherName: otherName(edge),
        evidenceCount: edge.evidence.length,
      };
    })
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const neighbors: NeighborVM[] = touching
    .map((edge) => {
      const oid = otherId(edge, node.id);
      const other = byId.get(oid);
      return {
        id: oid,
        name: other?.name ?? oid,
        type: other?.type ?? 'event',
        relation: edge.relation,
        confidence: other?.reality.confidence ?? 0,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const entity: EntityVM = {
    id: node.id,
    name: node.name,
    type: node.type,
    description: node.description,
    influence: node.influence,
    confidence: node.reality.confidence,
    freshness: node.reality.freshness,
    sources: node.reality.sources,
    firstSeen: node.first_seen,
    evidenceCount: evidence.length,
    freshnessDisplay: fmtDate(node.reality.freshness),
  };

  return (
    <AppShell chrome="app" title="Entity Details">
      <EntityView
        entity={entity}
        evidence={evidence}
        events={events}
        neighbors={neighbors}
      />
    </AppShell>
  );
}
