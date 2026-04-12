After any significant change, commit and push to GitHub.

# Charles CMS — CRM

A CRM web app for tracking people, organizations, relationships, and interactions. Built for Charles to manage networking contacts and activity.

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
│   ├── interactions/page.tsx     # Interactions list + detail (two-panel)
│   ├── trends/page.tsx           # Trends analysis (line charts)
│   ├── export/page.tsx           # CSV export
│   ├── login/page.tsx            # Password auth
│   └── api/
│       ├── people/               # CRUD + [id] + tags
│       ├── organizations/        # CRUD + [id] + types
│       ├── interactions/         # CRUD + [id] + types + mediums
│       ├── relationships/        # person-person, org-person, org-org + types
│       ├── stats/                # Monthly aggregation
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

## Data Model

**Core entities**: `people`, `organizations`
**Interactions**: `interactions` linked to people/orgs via junction tables (`interaction_people`, `interaction_organizations`), with `interaction_types` and `interaction_mediums`
**Relationships**: `relationships_person_person`, `relationships_org_person`, `relationships_org_org` — each with typed relationship types
**Supporting**: `person_tags`, `org_types`, and various relationship type tables

## Key Features

- **Side navbar**: Expandable CSS-based rail (icons-only collapsed, labels on hover)
- **People**: Two-panel CRUD with tags, relationships, interaction history
- **Organizations**: Two-panel CRUD with types, related people/orgs
- **Relationships**: Person-Person, Org-Person, Org-Org with custom types
- **Interactions**: Two-panel CRUD linking people/orgs, with types and mediums
- **Dashboard**: Stat cards per interaction type, monthly bar chart
- **Trends**: Line charts (total + per-type over time), summary stats
- **Export**: CSV download of all interactions

## External References

- `external/nexus` — Git submodule of the Nexus project, used as reference for CRM patterns and side navbar design

## Remote

GitHub: `git@github.com:Lemali-Consulting/Charles-CMS.git` (main branch)
