# Monitoring.md — Genesis Monitoring

## v1: minimal but real
No Datadog, no Sentry (free tiers exist, but setup time > demo value).
v1 monitoring = Vercel's built-in analytics + disciplined logging.

## What we watch
| Signal | Where | Alert threshold |
|---|---|---|
| Build failures | Vercel deploy logs | any failed production deploy |
| API errors (`/api/expand`, `/api/simulate`) | stdout JSON logs | > 5% error rate in a day |
| SerpApi credit consumption | `data/credit-log.jsonl` + CreditPill | < 20 remaining → amber banner |
| Groq rate limits (429s) | stdout JSON logs | any 429 → cooldown + toast |
| Page views / demo traffic | Vercel Analytics (free) | curiosity only |

## Credit monitoring (the critical one)
SerpApi's free tier is the scarcest resource. Every live call appends:
```json
{"t":"2026-10-08T12:00:00Z","engine":"google","query":"…","fresh":true,"credits_left_est":187}
```
`credits_left_est` is tracked client-side from a starting budget constant —
SerpApi doesn't expose a live balance endpoint on the free plan, so we count down
ourselves and stop before zero.

## Demo-day rule
Freeze deploys 24h before the deadline; watch the Vercel dashboard during judging
hours. If the site is down, the video carries the submission — the repo + video
are the deliverables, the live URL is a bonus.
