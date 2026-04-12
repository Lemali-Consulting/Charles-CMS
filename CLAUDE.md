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

## External References

- `external/nexus` — Git submodule of the Nexus project, used as reference for CRM patterns and side navbar design

## Remote

GitHub: `git@github.com:Lemali-Consulting/Charles-CMS.git` (main branch)
