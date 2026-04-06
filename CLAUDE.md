After any significant change, commit and push to GitHub.

# Charles CMS — IntroTracker

A web app for tracking introductions made between founders and stakeholders (investors, talent, customers). Built for Charles to log, analyze, and export networking activity.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts
- **Backend**: Next.js API routes, SQLite (better-sqlite3)
- **Export**: XLSX for Excel generation
- **Package manager**: npm

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard (stats, charts, share)
│   ├── log/page.tsx        # Log introduction form
│   ├── trends/page.tsx     # Trends analysis (line charts)
│   ├── export/page.tsx     # Dealroom Excel export
│   └── api/introductions/  # REST API routes
│       ├── route.ts        # GET all, POST new, DELETE
│       ├── stats/route.ts  # Monthly aggregation + tag breakdown
│       ├── tags/route.ts   # Distinct tags for autocomplete
│       └── export/route.ts # Excel file download
├── components/             # React components (Nav, IntroForm, charts, ShareStat)
└── lib/
    └── db.ts               # Database layer (schema, queries, migrations)
```

## Running

```bash
npm run dev      # Dev server at localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

The SQLite database (`introductions.db`) auto-initializes on first run and runs migrations automatically.

## Data Model

**introductions** table: `id`, `date`, `founder_name`, `contact_name`, `contact_types` (JSON array: founder/investor/talent/customer), `industry`, `company`, `university`, `website`, `notes`, `created_at`

## Key Features

- **Dashboard**: Monthly stat cards, stacked bar chart, tag breakdown, social share button
- **Log**: Form with multi-select contact types, autocomplete tags from DB
- **Trends**: Line charts (total + per-type over time), summary stats
- **Export**: Preview table + Excel download for Dealroom integration

## Remote

GitHub: `git@github.com:Lemali-Consulting/Charles-CMS.git` (main branch)