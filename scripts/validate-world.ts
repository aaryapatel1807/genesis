#!/usr/bin/env tsx
/**
 * Genesis world validator — Phase 3 data layer.
 * Implements the automated checks from Evaluation.md:
 *   (a) every edge's source/target resolves to a node id
 *   (b) every node has >= 1 source (reality.sources >= 1)
 *   (c) every edge has >= 1 evidence item with a non-empty http(s) URL
 *   (d) no duplicate normalized names within a type
 *       (normalize = lowercase, strip non-alphanumerics)
 *   (e) meta.node_count / meta.edge_count match the arrays
 *   (f) descriptions are non-empty and <= 2 sentences
 *
 * Minimal local interfaces only — no dependency on lib/types.
 * Usage: npx tsx scripts/validate-world.ts [path]
 *        (defaults to data/world.json; validates every snapshot too with --all)
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

// ---- minimal local interfaces (per task: do not import ../lib/types) ----
interface Reality { confidence: number; freshness: string; sources: number }
interface NodeT { id: string; name: string; type: string; description: string; influence: number; reality: Reality; first_seen: string }
interface Evidence { snippet: string; url: string; engine: string; date: string }
interface EdgeT { id: string; source: string; target: string; relation: string; strength: string; evidence: Evidence[] }
interface Meta { topic: string; built_at: string; node_count: number; edge_count: number; source_count: number; snapshot_year?: string }
interface World { meta: Meta; nodes: NodeT[]; edges: EdgeT[] }

const VALID_TYPES = new Set(["company","researcher","university","product","startup","funder","patent","event","technology","paper","job","country","government","law"]);
const VALID_RELATIONS = new Set(["investment","partnership","supplies","employs","researches","acquired","competes","powers"]);
const VALID_STRENGTHS = new Set(["strong","medium","weak"]);
const VALID_FIRST_SEEN = new Set(["2020","2022","2024","2026"]);

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sentenceCount(desc: string): number {
  const parts = desc.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  return parts.length;
}

interface CheckResult { name: string; pass: boolean; detail: string }

function validateWorld(path: string): { file: string; results: CheckResult[] } {
  const results: CheckResult[] = [];
  let world: World;
  try {
    world = JSON.parse(readFileSync(path, "utf8")) as World;
  } catch (err) {
    return { file: path, results: [{ name: "parse", pass: false, detail: `invalid JSON: ${(err as Error).message}` }] };
  }

  const nodeIds = new Set(world.nodes.map(n => n.id));

  // (a) every edge's source/target resolves to a node id
  const dangling = world.edges.filter(e => !nodeIds.has(e.source) || !nodeIds.has(e.target));
  results.push({
    name: "(a) edge endpoints resolve",
    pass: dangling.length === 0,
    detail: dangling.length === 0 ? `${world.edges.length} edges, all endpoints resolve` :
      `dangling: ${dangling.slice(0,5).map(e => e.id).join(", ")}${dangling.length > 5 ? ` (+${dangling.length - 5} more)` : ""}`,
  });

  // (b) every node has >= 1 source
  const sourceless = world.nodes.filter(n => !(n.reality && n.reality.sources >= 1));
  results.push({
    name: "(b) nodes have >=1 source",
    pass: sourceless.length === 0,
    detail: sourceless.length === 0 ? `${world.nodes.length} nodes, all have sources` :
      `sourceless: ${sourceless.slice(0,5).map(n => n.id).join(", ")}${sourceless.length > 5 ? ` (+${sourceless.length - 5} more)` : ""}`,
  });

  // (c) every edge has >= 1 evidence item with a non-empty http URL
  const badEvidence = world.edges.filter(e =>
    !Array.isArray(e.evidence) || e.evidence.length === 0 ||
    !e.evidence.every(ev => typeof ev.url === "string" && /^https?:\/\//.test(ev.url.trim()) && ev.snippet && ev.snippet.trim().length > 0)
  );
  results.push({
    name: "(c) edges have evidence + http URL",
    pass: badEvidence.length === 0,
    detail: badEvidence.length === 0 ? `${world.edges.length} edges, all carry valid evidence` :
      `bad: ${badEvidence.slice(0,5).map(e => e.id).join(", ")}${badEvidence.length > 5 ? ` (+${badEvidence.length - 5} more)` : ""}`,
  });

  // (d) no duplicate normalized names within a type
  const seen = new Map<string, string>(); // "type|norm" -> node id
  const dupes: string[] = [];
  for (const n of world.nodes) {
    const key = `${n.type}|${normalize(n.name)}`;
    if (seen.has(key)) dupes.push(`${n.id} ~ ${seen.get(key)} ("${n.name}")`);
    else seen.set(key, n.id);
  }
  results.push({
    name: "(d) no duplicate normalized names per type",
    pass: dupes.length === 0,
    detail: dupes.length === 0 ? `${seen.size} unique type|name keys` : `duplicates: ${dupes.slice(0,5).join("; ")}`,
  });

  // (e) meta counts match arrays
  const countsOk = world.meta.node_count === world.nodes.length && world.meta.edge_count === world.edges.length;
  results.push({
    name: "(e) meta counts match arrays",
    pass: countsOk,
    detail: countsOk ? `node_count=${world.meta.node_count}, edge_count=${world.meta.edge_count}` :
      `meta says ${world.meta.node_count}/${world.meta.edge_count}, arrays have ${world.nodes.length}/${world.edges.length}`,
  });

  // (f) descriptions: non-empty, <= 2 sentences (Evaluation.md)
  const badDesc = world.nodes.filter(n => !n.description || n.description.trim().length === 0 || sentenceCount(n.description) > 2);
  results.push({
    name: "(f) descriptions non-empty, <=2 sentences",
    pass: badDesc.length === 0,
    detail: badDesc.length === 0 ? `${world.nodes.length} nodes, all descriptions valid` :
      `bad: ${badDesc.slice(0,5).map(n => n.id).join(", ")}${badDesc.length > 5 ? ` (+${badDesc.length - 5} more)` : ""}`,
  });

  // (g) enum + contract sanity
  const badEnum = world.nodes.filter(n => !VALID_TYPES.has(n.type) || !VALID_FIRST_SEEN.has(n.first_seen))
    .concat(world.edges.filter(e => !VALID_RELATIONS.has(e.relation) || !VALID_STRENGTHS.has(e.strength)) as unknown as NodeT[]);
  const badIds = world.nodes.filter(n => !/^n_[a-z0-9_]+$/.test(n.id))
    .concat(world.edges.filter(e => !/^e_.+_.+_.+$/.test(e.id)) as unknown as NodeT[]);
  const enumOk = badEnum.length === 0 && badIds.length === 0;
  results.push({
    name: "(g) enums + id format",
    pass: enumOk,
    detail: enumOk ? "types, relations, strengths, first_seen, id formats all valid"
      : `bad enums: ${badEnum.slice(0,3).map((x: unknown) => (x as NodeT).id).join(", ")}; bad ids: ${badIds.slice(0,3).map((x: unknown) => (x as NodeT).id).join(", ")}`,
  });

  return { file: path, results };
}

function main(): void {
  const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");
  const arg = process.argv[2];
  let files: string[];
  if (arg === "--all") {
    const snapDir = join(repoRoot, "data", "snapshots");
    files = [join(repoRoot, "data", "world.json")];
    if (existsSync(snapDir)) {
      for (const f of readdirSync(snapDir).filter(f => f.endsWith(".json")).sort()) {
        files.push(join(snapDir, f));
      }
    }
  } else {
    files = [resolve(arg ?? join(repoRoot, "data", "world.json"))];
  }

  let totalFail = 0;
  for (const file of files) {
    const { results } = validateWorld(file);
    console.log(`\n== ${file} ==`);
    for (const r of results) {
      console.log(`  [${r.pass ? "PASS" : "FAIL"}] ${r.name} — ${r.detail}`);
      if (!r.pass) totalFail++;
    }
    const failed = results.filter(r => !r.pass).length;
    console.log(`  summary: ${results.length - failed}/${results.length} checks passed`);
  }
  if (totalFail > 0) {
    console.log(`\nVALIDATION FAILED: ${totalFail} check(s) failed`);
    process.exit(1);
  }
  console.log("\nVALIDATION PASSED");
}

main();
