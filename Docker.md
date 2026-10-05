# Docker.md — Genesis Containerization

## v1 stance: Docker is optional
Genesis v1 deploys to Vercel (serverless) — no containers needed for the hackathon.
Docker exists for one purpose: **reproducible world builds** — anyone can run
`scripts/build-world.ts` in the same Node environment and regenerate `data/world.json`.

## Dockerfile (build environment)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["npx", "tsx", "scripts/build-world.ts"]
```
- Env: `SERPAPI_API_KEY`, `GROQ_API_KEY` passed at runtime (`--env-file .env`), never baked in.
- Output: mount `./data` as a volume so `world.json` + `build-log.jsonl` land on the host.

## What Docker does NOT do in v1
- No production app container (Vercel handles it).
- No database container (JSON files).
- No compose stack. If v2 adds Postgres/Redis, compose comes then.

## Judge relevance
Low. Mentioned in README as "rebuild the world yourself" for credibility, not a demo feature.
