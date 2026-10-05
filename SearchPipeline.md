# SearchPipeline.md — Genesis SerpApi Usage

## Engines
| Engine | Used for | Param notes |
|---|---|---|
| `google` | Seed queries, node expansion | `num=10`, `gl=us`, `hl=en` |
| `google_news` | Ecosystem pulse, event nodes | `num=10` |
| `google_scholar` | Researchers, papers, universities | `num=10` — feeds Research layer |
| `google_jobs` | Hiring activity, startup growth signals | `num=10` — feeds Jobs layer |

Four engines — the DNA's knowledge sources (§16) require jobs and research publications,
and an AI-ecosystem world without researchers/papers would be hollow.

## Seed queries (world build, run once via `scripts/build-world.ts`)
```
# companies & products
"top artificial intelligence companies 2026"
"largest AI labs and startups 2026"
"most popular AI products 2026"
# people & institutions
"leading AI researchers 2026"
"top universities AI research 2026"
# money & news
"AI startup funding rounds 2026"
"artificial intelligence news"            # google_news
"AI industry developments"                # google_news
# research (google_scholar)
"large language models"                   # scholar: papers + authors
"diffusion models research"               # scholar
# hiring (google_jobs)
"machine learning engineer"               # jobs: who is hiring
"AI researcher jobs"                      # jobs
```
≈ 12 searches for the present world.

## Snapshots (time machine)
Same seed queries with `tbs` date restriction, one per year:
```
tbs = "cdr:1,cd_min:1/1/2020,cd_max:12/31/2020"   # → 2020.json
tbs = "cdr:1,cd_min:1/1/2022,cd_max:12/31/2022"   # → 2022.json
tbs = "cdr:1,cd_min:1/1/2024,cd_max:12/31/2024"   # → 2024.json
```
Present world = unrestricted. 4 snapshots × ~6 queries ≈ 24 searches, one time.

## Expansion queries (live, capped)
Per node: `"${name}" partnerships OR investment`, `"${name}" news` → max 2 searches.
Session cap: 10 fresh searches; over cap → cached-only mode (429 + flag).

## Credit budget
| Item | Searches |
|---|---|
| World build (once) | ~12 |
| Snapshots (once) | ~32 |
| Demo rehearsals + judging buffer | ~20 |
| **Total planned** | **~64 of ~100–250 free** |

Healthy margin. The ledger (`data/credit-ledger.json`) is checked by `build-world.ts`
before every run; it refuses to run if projected cost exceeds remaining.

## Reliability rules
- **All** calls through `lib/serpapi.ts`: 1/sec throttle (free-plan limit), cache-first,
  ledger decrement only on fresh calls.
- Cache key: `sha256(engine + query + sorted params)`. Repeats within ~1h are free
  (SerpApi-side cache) — the wrapper treats them as cached regardless.
- Never run the pipeline from a request handler in v1 — only `scripts/build-world.ts`
  (human-supervised) and the capped `/expand` route.
