After any significant change, commit and push to GitHub.

# Charles CMS — Introduction Tracker

A CRM web app focused on tracking introductions between investors, customers, and talent. Built for Charles to manage networking contacts and introduction activity.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts
- **Backend**: Next.js API routes, SQLite (better-sqlite3)
- **Auth**: bcryptjs + JWT session tokens
- **Package manager**: npm

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Dashboard (stats, charts)
│   ├── people/page.tsx           # People list + detail (two-panel)
│   ├── organizations/page.tsx    # Organizations list + detail (two-panel)
│   ├── relationships/page.tsx    # Person-Person, Org-Person, Org-Org relationships
│   ├── interactions/page.tsx     # Introductions list + detail (two-panel)
│   ├── trends/page.tsx           # Trends analysis with category tabs
│   ├── export/page.tsx           # CSV export
│   ├── login/page.tsx            # Password auth
│   └── api/
│       ├── people/               # CRUD + [id] + categories
│       ├── organizations/        # CRUD + [id] + types
│       ├── interactions/         # Introduction creation + mediums
│       ├── relationships/        # person-person, org-person, org-org + types
│       ├── stats/                # Monthly aggregation + category breakdowns
│       └── auth/                 # login, logout
├── components/                   # Nav (side rail), MonthlySummary, TrendChart
└── lib/
    ├── db.ts                     # Database layer (schema, all queries)
    └── auth.ts                   # Password verification, JWT sessions
```

## Running

```bash
npm run dev      # Dev server at localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

The SQLite database (`crm.db`) auto-initializes on first run with all tables and seed data.

## Seeding Test Data

The seed script (`scripts/seed.js`) populates the database with realistic test data: 100 people, 15 organizations, 20 introductions, and ~25+ relationships. It is idempotent — safe to run multiple times.

```bash
# Local (creates/seeds crm.db in the intro-tracker directory)
npm run seed

# Fly.io (DB_DIR is set in fly.toml, pointing to the /data volume)
fly ssh console -C "node scripts/seed.js"
```

To start fresh, delete `crm.db` before seeding.

## Data Model

**Core entities**: `people` (with fixed categories: Investor, Customer, Talent), `organizations`
**Introductions**: `interactions` table (type always "Introduction"), linked to people via `interaction_people`, with `interaction_mediums` (Email default)
**Relationships**: `relationships_person_person`, `relationships_org_person`, `relationships_org_org` — "Introduced" type auto-created when logging introductions
**Supporting**: `person_categories`, `person_category_links`, `org_types`, and various relationship type tables

## Key Features

- **Side navbar**: Expandable CSS-based rail (icons-only collapsed, labels on hover)
- **People**: Two-panel CRUD with category toggles (Investor/Customer/Talent), relationships, introduction history
- **Organizations**: Two-panel CRUD with types, related people/orgs
- **Relationships**: Person-Person, Org-Person, Org-Org with custom types; "Introduced" auto-created on intro logging
- **Introductions**: Simplified form — Person 1, Person 2+, Medium (default Email), Date (default today), Notes
- **Dashboard**: Stat cards (People, Orgs, This Month, Investor/Customer/Talent intros), monthly bar chart
- **Trends**: Tabbed view (All/Investor/Customer/Talent) with Total, Avg/Month, Months Tracked, line chart
- **Export**: CSV download of all introductions

## Monitoring

### Sentry (error reporting)

Config files: `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `instrumentation-client.ts`. `next.config.ts` is wrapped with `withSentryConfig`. Sentry only initializes when the DSN env var is present, so local dev without DSN is silent.

Required env vars:
- `SENTRY_DSN` — server DSN (Fly secret).
- `NEXT_PUBLIC_SENTRY_DSN` — client DSN, baked into the browser bundle at build time.
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` — only needed to upload source maps during the build. If `SENTRY_AUTH_TOKEN` is absent, source-map upload is skipped and the build still succeeds.

Set on Fly:
```bash
fly secrets set SENTRY_DSN=https://... NEXT_PUBLIC_SENTRY_DSN=https://...
# Optional (for source maps in CI / fly deploy):
fly secrets set SENTRY_ORG=... SENTRY_PROJECT=... SENTRY_AUTH_TOKEN=...
```

To verify alerts end-to-end, temporarily throw from an API route (e.g. `throw new Error("sentry smoke test")` in `src/app/api/stats/route.ts`), hit it, confirm the event shows up in Sentry, then revert.

### Litestream (SQLite continuous replication)

Config: `litestream.yml` at repo root (env-var driven, no secrets checked in). Installed as a static binary in the Dockerfile and invoked by `scripts/entrypoint.sh`, which:
1. Runs `litestream restore` if `/data/crm.db` is missing (fresh machine recovers from the replica).
2. Supervises Next.js via `litestream replicate -exec "node server.js"` — if Next.js exits, the container exits and Litestream flushes on shutdown.

Required Fly secrets (Cloudflare R2 or any S3-compatible bucket):
```bash
fly secrets set \
  LITESTREAM_BUCKET=charles-crm-backups \
  LITESTREAM_PATH=crm.db \
  LITESTREAM_ENDPOINT=https://<account>.r2.cloudflarestorage.com \
  LITESTREAM_REGION=auto \
  LITESTREAM_ACCESS_KEY_ID=... \
  LITESTREAM_SECRET_ACCESS_KEY=...
```

If `LITESTREAM_BUCKET` is unset, the entrypoint runs Next.js without replication (useful for local Docker runs).

Pull a local snapshot to query offline:
```bash
litestream restore \
  -o ./local-crm.db \
  -config ./litestream.yml \
  /data/crm.db
# or point directly at the replica:
litestream restore -o ./local-crm.db s3://$LITESTREAM_BUCKET/$LITESTREAM_PATH
```

List snapshots: `litestream snapshots -config ./litestream.yml /data/crm.db`.

The existing `fly ssh console -C "node scripts/seed.js"` seed flow still works — Litestream replicates seeded rows automatically.

## External References

- `external/nexus` — Git submodule of the Nexus project, used as reference for CRM patterns and side navbar design

## Remote

GitHub: `git@github.com:Lemali-Consulting/Charles-CMS.git` (main branch)
