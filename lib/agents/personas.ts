/**
 * lib/agents/personas.ts — MiroFish-inspired persona generation.
 *
 * Every simulated entity becomes an *agent* with a persona: a bio, traits,
 * a stance, an influence weight and a voice. The simulator uses these so
 * cascade rounds read as reactions from the ecosystem's inhabitants,
 * not as anonymous graph events.
 *
 * Fully deterministic and template-driven (zero LLM): the simulator must
 * work in demo mode with no API keys. An LLM enrichment pass can be
 * layered on later without changing this contract.
 */
import type { GNode, NodeType, World } from '../types';

export type ActivityLevel = 'low' | 'medium' | 'high';

export interface Persona {
  nodeId: string;
  name: string;
  type: NodeType;
  /** One-line identity, e.g. "An AI lab racing to ship frontier models." */
  bio: string;
  /** 2–3 stable traits that colour reactions. */
  traits: string[];
  /** Decision lens, e.g. "market-driven". */
  stance: string;
  /** 0..1, normalised from node influence. */
  influenceWeight: number;
  /** Posting/acting cadence bucket. */
  activityLevel: ActivityLevel;
  /** Sample opener used when the persona reacts, e.g. "From our position,". */
  voice: string;
}

interface TypeProfile {
  stance: string;
  traits: [string, string, string];
  bio: (name: string) => string;
  voice: string;
  /** Non-actors (artefacts, places) react descriptively, not in first person. */
  actor: boolean;
}

const PROFILES: Record<NodeType, TypeProfile> = {
  company: {
    stance: 'market-driven',
    traits: ['competitive', 'scaling', 'brand-aware'],
    bio: (n) => `${n} is a company competing in the AI ecosystem.`,
    voice: 'From our position in the market,',
    actor: true,
  },
  startup: {
    stance: 'disruption-seeking',
    traits: ['fast-moving', 'risk-tolerant', 'narrative-driven'],
    bio: (n) => `${n} is a startup trying to outrun incumbents.`,
    voice: 'We move fast, so',
    actor: true,
  },
  funder: {
    stance: 'return-focused',
    traits: ['thesis-driven', 'networked', 'patient'],
    bio: (n) => `${n} allocates capital across the AI ecosystem.`,
    voice: 'Through the lens of our thesis,',
    actor: true,
  },
  researcher: {
    stance: 'evidence-driven',
    traits: ['rigorous', 'curious', 'peer-oriented'],
    bio: (n) => `${n} is a researcher publishing at the frontier.`,
    voice: 'The evidence suggests',
    actor: true,
  },
  university: {
    stance: 'knowledge-driven',
    traits: ['collaborative', 'prestigious', 'long-horizon'],
    bio: (n) => `${n} is a university producing AI research and talent.`,
    voice: 'As an institution,',
    actor: true,
  },
  product: {
    stance: 'user-obsessed',
    traits: ['iterative', 'adoption-focused', 'polished'],
    bio: (n) => `${n} is a product fighting for user attention.`,
    voice: 'For our users,',
    actor: true,
  },
  technology: {
    stance: 'capability-driven',
    traits: ['foundational', 'composable', 'fast-evolving'],
    bio: (n) => `${n} is a technology others build on.`,
    voice: 'As a building block,',
    actor: false,
  },
  paper: {
    stance: 'evidence-driven',
    traits: ['cited', 'reproducible', 'narrow'],
    bio: (n) => `"${n}" is a research paper shaping the discourse.`,
    voice: 'The findings indicate',
    actor: false,
  },
  patent: {
    stance: 'defensive',
    traits: ['novel', 'protected', 'licensable'],
    bio: (n) => `${n} is a patent fencing off an invention.`,
    voice: 'As protected IP,',
    actor: false,
  },
  event: {
    stance: 'moment-driven',
    traits: ['catalytic', 'time-boxed', 'public'],
    bio: (n) => `${n} is an event that moved the ecosystem.`,
    voice: 'In that moment,',
    actor: false,
  },
  job: {
    stance: 'talent-driven',
    traits: ['competitive', 'skill-hungry', 'mobile'],
    bio: (n) => `${n} is a role pulling talent through the ecosystem.`,
    voice: 'For hiring,',
    actor: false,
  },
  country: {
    stance: 'sovereignty-driven',
    traits: ['strategic', 'regulatory', 'patient'],
    bio: (n) => `${n} is a state steering its AI posture.`,
    voice: 'In the national interest,',
    actor: true,
  },
  government: {
    stance: 'policy-driven',
    traits: ['regulatory', 'deliberative', 'accountable'],
    bio: (n) => `${n} is a government body setting the rules.`,
    voice: 'From a policy standpoint,',
    actor: true,
  },
  law: {
    stance: 'compliance-driven',
    traits: ['binding', 'precedent-setting', 'slow'],
    bio: (n) => `${n} is a law constraining what actors may do.`,
    voice: 'Under this framework,',
    actor: false,
  },
};

/** Deterministic pick from a list, stable for a given key. */
function pick<T>(list: readonly T[], key: string): T {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return list[h % list.length];
}

/** Reaction cores per stance — the persona's take on being hit by a shock. */
const REACTION_CORES: Record<string, readonly string[]> = {
  'market-driven': [
    'we are reassessing our position.',
    'this changes the competitive calculus.',
    'we see both risk and an opening here.',
  ],
  'disruption-seeking': [
    'this is exactly the chaos we exploit.',
    'incumbents will fumble this — we will not.',
    'time to ship faster.',
  ],
  'return-focused': [
    'we are repricing the risk.',
    'our portfolio construction assumed calmer waters.',
    'we look for who benefits second-order.',
  ],
  'evidence-driven': [
    'we need to see the data before reacting.',
    'one scenario is not a trend.',
    'interesting — worth a closer study.',
  ],
  'knowledge-driven': [
    'our researchers will be watching closely.',
    'this will reshape what we teach.',
    'collaboration matters more now.',
  ],
  'user-obsessed': [
    'our users will feel this first.',
    'we need to respond in the product, not in words.',
    'trust is the thing at stake.',
  ],
  'capability-driven': [
    'everything built on top shifts a little.',
    'adoption curves bend here.',
    'the stack absorbs shocks slowly, then all at once.',
  ],
  defensive: [
    'the moat just got tested.',
    'licensing leverage moves with this.',
    'we enforce, we do not panic.',
  ],
  'moment-driven': [
    'the room felt this one.',
    'narratives rewrite themselves after moments like this.',
    'everyone will reference this date.',
  ],
  'talent-driven': [
    'hiring plans just changed.',
    'talent flows toward the winners of this.',
    'compensation expectations move with shocks.',
  ],
  'sovereignty-driven': [
    'strategic autonomy is the question now.',
    'we do not outsource this decision.',
    'resilience beats efficiency here.',
  ],
  'policy-driven': [
    'we will consult before we regulate.',
    'the framework needs to catch up.',
    'stability of the rules is the priority.',
  ],
  'compliance-driven': [
    'obligations tighten from here.',
    'counsel will be busy.',
    'the letter of the law just mattered more.',
  ],
};

const FALLBACK_CORES = [
  'we are watching how this unfolds.',
  'this touches us more than it looks.',
  'adaptation is the only plan.',
] as const;

/**
 * Build a persona for a single node. Pure and deterministic:
 * same node in → same persona out.
 */
export function buildPersona(node: GNode): Persona {
  const profile = PROFILES[node.type];
  const influenceWeight = Math.min(1, Math.max(0, node.influence / 100));
  const activityLevel: ActivityLevel =
    node.influence >= 70 ? 'high' : node.influence >= 40 ? 'medium' : 'low';
  return {
    nodeId: node.id,
    name: node.name,
    type: node.type,
    bio: profile.bio(node.name),
    traits: [...profile.traits],
    stance: profile.stance,
    influenceWeight: Math.round(influenceWeight * 100) / 100,
    activityLevel,
    voice: profile.voice,
  };
}

/**
 * The persona's one-line reaction to being hit by a cascade effect.
 * Deterministic per (persona, effect): no LLM, no randomness.
 */
export function react(persona: Persona, effect: string): string {
  const cores = REACTION_CORES[persona.stance] ?? FALLBACK_CORES;
  const core = pick(cores, `${persona.nodeId}|${effect}`);
  const profile = PROFILES[persona.type];
  if (!profile.actor) {
    return `${persona.voice} ${core.charAt(0).toLowerCase()}${core.slice(1)}`;
  }
  return `${persona.voice} ${core}`;
}

/**
 * Build personas for a set of node ids (defaults to the whole world).
 * Unknown ids are skipped.
 */
export function buildPersonas(world: World, nodeIds?: readonly string[]): Persona[] {
  const wanted = nodeIds ? new Set(nodeIds) : null;
  const out: Persona[] = [];
  for (const node of world.nodes) {
    if (wanted && !wanted.has(node.id)) continue;
    out.push(buildPersona(node));
  }
  return out;
}

/** Index personas by node id for O(1) lookup during simulation rounds. */
export function indexPersonas(personas: readonly Persona[]): Map<string, Persona> {
  const map = new Map<string, Persona>();
  for (const p of personas) map.set(p.nodeId, p);
  return map;
}
