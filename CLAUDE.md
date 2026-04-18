After any significant change, commit and push to GitHub.

# Charles CMS — Introduction Tracker

A CRM web app focused on tracking introductions between investors, customers, and talent. Built for Charles to manage networking contacts and introduction activity.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts
- **Backend**: Next.js API routes, SQLite (better-sqlite3)
- **Auth**: Auth.js v5 (NextAuth) magic-link email via Resend; JWT sessions
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
│   ├── login/page.tsx            # Magic-link email login
│   └── api/
│       ├── people/               # CRUD + [id] + categories
│       ├── organizations/        # CRUD + [id] + types
│       ├── interactions/         # Introduction creation + mediums
│       ├── relationships/        # person-person, org-person, org-org + types
│       ├── stats/                # Monthly aggregation + category breakdowns
│       └── auth/[...nextauth]/   # Auth.js handler (signin, signout, callback, csrf)
├── components/                   # Nav (side rail), MonthlySummary, TrendChart
├── proxy.ts                      # Auth.js edge middleware (route protection)
└── lib/
    ├── db.ts                     # Database layer (schema, all queries, users table)
    ├── auth.ts                   # Auth.js config + SQLite adapter + Resend provider
    ├── auth.config.ts            # Edge-safe Auth.js config (used by proxy.ts)
    ├── allowlist.ts              # isEmailAllowed + parseAllowlist
    └── rate-limit.ts             # In-memory login rate limiter
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

## Authentication

Magic-link email auth via Auth.js v5 + Resend. No passwords. Only emails on the allowlist can sign in; non-allowlisted submissions show the same "check your email" UI but no email is sent (prevents user enumeration). Rate-limited to 5 signin requests per 10 minutes per IP (in-memory).

### Env vars

- `AUTH_SECRET` — JWT signing secret (`openssl rand -base64 32`).
- `AUTH_URL` — public origin of the deployed app (magic-link target host).
- `AUTH_RESEND_KEY` — Resend API key.
- `AUTH_EMAIL_FROM` — From address, e.g. `Charles CMS <noreply@yourdomain>`.
- `AUTH_ALLOWED_EMAILS` — comma-separated allowlist. **Empty/missing = deny all.**

### Resend setup

1. Create an account at https://resend.com.
2. Verify a sender domain under Domains → Add Domain (DNS records: SPF/DKIM).
3. Create an API key under API Keys.
4. Use `noreply@<verified-domain>` as `AUTH_EMAIL_FROM`.

### Fly secrets

```bash
fly secrets set \
  AUTH_SECRET="$(openssl rand -base64 32)" \
  AUTH_URL=https://charles-cms.fly.dev \
  AUTH_RESEND_KEY=re_xxx \
  AUTH_EMAIL_FROM="Charles CMS <noreply@yourdomain>" \
  AUTH_ALLOWED_EMAILS="charles@example.com,max@example.com"
```

To add/remove an allowed user: re-run `fly secrets set AUTH_ALLOWED_EMAILS=...` with the new CSV and redeploy (or `fly apps restart`).

`AUTH_URL` must match the origin users load — mismatch breaks the magic-link redirect.

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

Storage backend is **Tigris** (S3-compatible, provisioned as a Fly add-on). Provision and wire up in one command:

```bash
fly storage create --app charles-crm
```

This creates a bucket and injects these Fly secrets automatically:
- `BUCKET_NAME`
- `AWS_ENDPOINT_URL_S3`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Litestream picks up `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` natively; the other three are referenced in `litestream.yml`. If `BUCKET_NAME` is unset (e.g. local Docker runs), the entrypoint runs Next.js without replication.

Pull a local snapshot to query offline (use the same creds locally):
```bash
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...
litestream restore \
  -o ./local-crm.db \
  s3://$BUCKET_NAME/crm.db
# endpoint is read from AWS_ENDPOINT_URL_S3 via --replica-endpoint if needed:
# litestream restore -replica-endpoint $AWS_ENDPOINT_URL_S3 -o ./local-crm.db s3://$BUCKET_NAME/crm.db
```

Verify replication from inside the container (Litestream 0.5.x CLI):
```bash
fly ssh console -C "litestream status -config /etc/litestream.yml"
fly ssh console -C "litestream ltx -config /etc/litestream.yml /data/crm.db"
```

The existing `fly ssh console -C "node scripts/seed.js"` seed flow still works — Litestream replicates seeded rows automatically.

## External References

- `external/nexus` — Git submodule of the Nexus project, used as reference for CRM patterns and side navbar design

## Remote

GitHub: `git@github.com:Lemali-Consulting/Charles-CMS.git` (main branch)
