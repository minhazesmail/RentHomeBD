# RentHomeBD

RentHomeBD is a map-first apartment and home rental SaaS for Bangladesh. Renters discover available properties by location and owners publish structured listings with exact map pins and tenant preferences.

## Product direction

The MVP is being built incrementally, one task at a time. Its core pillars are:

- exact GPS/map-based property discovery
- mandatory tenant-type matching
- fresh, moderated listings
- phone-verified accounts and in-app communication
- a foundation that can later support agents, verification, commute search, roommate matching, and multi-city expansion

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase (database/auth/storage in upcoming tasks)

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in the Supabase URL and publishable key in .env.local.
npm run dev
```

Then open `http://localhost:3000`.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```
