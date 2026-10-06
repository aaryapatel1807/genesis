/**
 * Genesis v2 semantic category system.
 *
 * The 14 entity types in data/world.json are folded onto 8 mission-control
 * categories. Canvas node paint, the filter chips, and the legend all read
 * from here so the palette stays consistent. Colors are tokens: the same
 * hexes live as --cat-* CSS vars in app/globals.css (the :root block is the
 * single source of truth for styling; this module is the single source of
 * truth for logic).
 */

export interface Category {
  /** Stable id — also the suffix of the matching --cat-* CSS var. */
  id: string;
  label: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'companies', label: 'Companies', color: '#6ea8fe' },
  { id: 'research', label: 'Research', color: '#3ddc84' },
  { id: 'people', label: 'People', color: '#b48cf2' },
  { id: 'products', label: 'Products', color: '#ff9f43' },
  { id: 'funding', label: 'Funding', color: '#f5c542' },
  { id: 'news', label: 'News', color: '#ff6b6b' },
  { id: 'government', label: 'Government', color: '#7cc7ff' },
  { id: 'other', label: 'Other', color: '#e9f2f3' },
];

/**
 * Mapping table: the 14 real entity types in data/world.json.
 *
 * - companies: company, startup
 * - research: university, paper, technology, patent
 * - people: researcher
 * - products: product
 * - funding: funder
 * - news: event
 * - government: country, government, law
 * - other: job (plus any future dataset/tool/benchmark/insight types)
 */
const TYPE_TO_CATEGORY_ID: Record<string, string> = {
  company: 'companies',
  startup: 'companies',
  university: 'research',
  paper: 'research',
  technology: 'research',
  patent: 'research',
  researcher: 'people',
  product: 'products',
  funder: 'funding',
  event: 'news',
  country: 'government',
  government: 'government',
  law: 'government',
  job: 'other',
};

const OTHER: Category =
  CATEGORIES.find((c) => c.id === 'other') ?? CATEGORIES[CATEGORIES.length - 1]!;

/**
 * Resolve an entity type to its category. Unknown types (datasets, tools,
 * benchmarks, insights, or anything the world builder invents later) fall
 * back to Other rather than throwing — the graph must never break on new
 * data.
 */
export function categoryOf(entityType: string): Category {
  const id = TYPE_TO_CATEGORY_ID[entityType] ?? 'other';
  return CATEGORIES.find((c) => c.id === id) ?? OTHER;
}
