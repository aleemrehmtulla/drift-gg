# drift.gg

**How much will you drift off the beat?**

A rhythm game that tests how well you can keep a beat. A beat plays — you tap along. It stops — you keep going. Your score reflects how much you drifted.

Built by [Aleem Rehmtulla](https://aleemrehmtulla.com) with inspiration from [Dialed.gg](https://dialed.gg)

[Play now →](https://drift.gg)

<img width="1234" height="919" alt="drift-ss" src="https://github.com/user-attachments/assets/506374cf-8ead-4a23-8248-3a77f5dca614" />


## Features

- **Solo mode** — random BPM, instant results
- **Multiplayer** — real-time head-to-head via room codes
- **Daily challenge** — same BPM for everyone, daily leaderboard
- **Challenge links** — share your score, friends play the same BPM
- **Easy / Hard difficulty** — 10s or 5s phases
- **Shareable score cards** — download image, copy link, native share
- **Mobile-friendly** — tap anywhere, haptic feedback, responsive design
- **No signup required** — play instantly in any browser

## Tech Stack

- **Frontend:** Next.js (Pages Router), Tailwind CSS, Framer Motion
- **Backend:** Express, Socket.io
- **Database:** PostgreSQL & Prisma
- **Audio:** Web Audio API (oscillator-based, no audio files)
- **Monorepo:** Turborepo, pnpm workspaces
- **Sharing:** html-to-image, satori + sharp for OG images

## Getting Started

Prerequisites: Node.js 18+, pnpm, a PostgreSQL database

```bash
git clone https://github.com/aleemrehmtulla/drift-gg.git
cd drift-gg
cp .env.example apps/api/.env
cp .env.example apps/web/.env

# Fill in DATABASE_URL in apps/api/.env and packages/db/.env
# Adjust NEXT_PUBLIC_* vars in apps/web/.env if needed

pnpm install
pnpm turbo db:generate
pnpm turbo db:migrate
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:5001

## Project Structure

- `apps/web` — Next.js frontend (Pages Router, Tailwind, Framer Motion)
- `apps/api` — Express + Socket.io backend (game logic, REST API, OG images)
- `packages/db` — Prisma schema and client (Game, Player models)
- `packages/shared` — Types, constants, scoring algorithm, utilities (runs on client and server)

## Deployment

| Service  | Platform | Required Env Vars                                                       |
| -------- | -------- | ----------------------------------------------------------------------- |
| Web      | Vercel   | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_SITE_URL` |
| API      | Render   | `DATABASE_URL`, `CORS_ORIGIN`, `PORT`, `NODE_ENV`                       |
| Database | Neon     | `DATABASE_URL` (shared with API and packages/db)                        |


note: this was just a one-day vibe code project :-) if u find issues or have feedback lmk [@aleemrehmtulla](https://twitter.com/aleemrehmtulla)

ps. if you liked this, toss a star on the repo <:)

## License

MIT
