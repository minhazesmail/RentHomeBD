# RentHomeBD (NearBasha)

Map-first apartment and home rental SaaS for Bangladesh. Renters discover moderated properties by exact location; owners publish structured listings with map pins and tenant preferences.

## Product direction

MVP pillars:

- Exact GPS/map-based property discovery
- Mandatory tenant-type matching
- Fresh, moderated listings
- Phone-verified accounts and in-app messaging
- Foundation for agents, role verification, commute search, roommate matching, and multi-city expansion

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase (Auth, Postgres + PostGIS, Storage, RLS)
- Leaflet / react-leaflet for maps

## Local development

```bash
npm install
cp .env.example .env.local
# Required: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Open `http://localhost:3000`.

**Environment variables are required.** There are no hardcoded production defaults. See `.env.example`.

### Database

Schema is managed exclusively through files in `supabase/migrations/`. Do **not** apply `supabase/schema.sql` alone — it is a historical Task 2 snapshot.

```bash
# Against a linked Supabase project
supabase db push

# Regenerate TypeScript types after migrations
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

See `supabase/README.md` and `docs/phone-otp-production.md` for security and production notes.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run deadcode
npm run uiqa
npm run i18nqa
npm run build
```

CI also runs browser theme QA (Playwright) when secrets are configured.
