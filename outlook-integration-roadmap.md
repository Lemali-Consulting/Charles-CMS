# Outlook Integration Roadmap — Charles CMS

Connect the CRM to Microsoft Graph (the "Outlook API") to (1) auto-import new
contacts into a review queue and (2) surface the inbound/sent email inbox so
recipients can be linked to introductions.

## Goals

1. **Contact import queue** — new/changed Outlook contacts land in a review
   queue where Charles approves them into the CRM (choosing category and org),
   merges them into an existing person, or rejects them.
2. **Email inbox surface** — recent inbound and sent mail is browsable in-app;
   recipients are matched against `people`, and matched messages offer
   one-click introduction logging.

## Design Decisions

- **Outlook is a data source, not an identity provider.** Magic-link stays the
  app login. A separate "Connect Outlook" OAuth flow links Charles's mailbox.
  This keeps the allowlist gating and existing auth model untouched.
- **Delegated permissions**, authorization-code flow — the integration acts as
  the signed-in user, not as a tenant-wide app.
- **Store email metadata only**, not bodies. Bodies are fetched on demand from
  Graph. Rationale: `crm.db` is replicated to Tigris by Litestream, so every
  stored byte is also an object-storage write.
- **Tokens are encrypted at rest** (AES-GCM). Refresh tokens otherwise sit in
  plaintext inside the replicated SQLite file.
- **Sync is delta-poll first, webhooks later.** A scheduled job using Graph
  `/delta` endpoints is simpler and sufficient; webhooks can be added in Phase 4
  if real-time freshness is needed.

## New Environment Variables / Fly Secrets

```
MS_CLIENT_ID          # Entra app (client) ID
MS_CLIENT_SECRET      # Entra client secret
MS_TENANT             # "common" | "consumers" | tenant GUID
MS_REDIRECT_URI       # https://charles-cms.fly.dev/api/integrations/outlook/callback
TOKEN_ENC_KEY         # 32-byte base64 key for AES-GCM token encryption

# Phase 2 Track B (BCC ingestion) only:
INBOUND_EMAIL_SECRET  # signing secret for the inbound-email provider webhook
```

---

## Phase 0 — OAuth & Token Layer (prerequisite)

The riskiest phase: all net-new infrastructure. Everything else depends on it.

### Tasks

1. **Entra app registration** (Azure portal, one-time, manual)
   - Supported account types: match Charles's mailbox (Outlook.com personal vs.
     M365 work account). Use `common`/`consumers` accordingly.
   - Redirect URI: `…/api/integrations/outlook/callback`.
   - Delegated API permissions: `Contacts.Read`, `Mail.Read`, `User.Read`,
     `offline_access`.
   - Generate a client secret.

2. **Data model** — new table in `src/lib/db.ts`:
   ```sql
   CREATE TABLE IF NOT EXISTS oauth_connections (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT NOT NULL,
     provider TEXT NOT NULL DEFAULT 'outlook',
     account_email TEXT,
     access_token TEXT NOT NULL,        -- AES-GCM encrypted
     refresh_token TEXT NOT NULL,       -- AES-GCM encrypted
     expires_at INTEGER NOT NULL,
     contacts_delta_link TEXT,
     inbox_delta_link TEXT,
     sent_delta_link TEXT,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     UNIQUE(user_id, provider),
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );
   ```

3. **Token encryption helper** — `src/lib/crypto.ts`: `encrypt()` / `decrypt()`
   using AES-256-GCM keyed by `TOKEN_ENC_KEY`.

4. **OAuth flow** — two API routes:
   - `GET /api/integrations/outlook/connect` — builds the Entra authorize URL
     (with `state` CSRF token) and redirects.
   - `GET /api/integrations/outlook/callback` — exchanges the code for tokens,
     fetches `/me` for the account email, stores an encrypted `oauth_connections`
     row. Guard with the existing session + allowlist (`guardApiRequest`).

5. **Graph client helper** — `src/lib/graph.ts`: a `graphFetch()` wrapper that
   loads the connection, refreshes the access token when `expires_at` is near,
   re-persists it, and retries once on 401. Handles 429 throttling with backoff.

6. **Settings UI** — a page (or section) with "Connect Outlook" / connection
   status / "Disconnect" (deletes the row).

### Deliverable
Charles can connect and disconnect his Outlook account; tokens persist
encrypted and auto-refresh. No data synced yet.

### Acceptance
- Connecting stores an encrypted row; disconnecting removes it.
- `graphFetch('/me')` succeeds an hour later (refresh works).
- Plaintext tokens never appear in `crm.db`.

---

## Phase 1 — Contact Import Queue

### Tasks

1. **Data model** — `pending_contacts`:
   ```sql
   CREATE TABLE IF NOT EXISTS pending_contacts (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     graph_id TEXT NOT NULL UNIQUE,
     email TEXT DEFAULT '',
     first_name TEXT DEFAULT '',
     last_name TEXT DEFAULT '',
     raw_json TEXT,
     status TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
     suggested_person_id INTEGER,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     resolved_at TEXT,
     FOREIGN KEY (suggested_person_id) REFERENCES people(id) ON DELETE SET NULL
   );
   ```

2. **Contact sync job** — `scripts/sync-outlook-contacts.js`: calls
   `/me/contacts/delta`, stores the delta link on the connection, upserts new/
   changed contacts as `pending` rows. Dedup against `people.email` via the
   existing `findPersonByEmail` — set `suggested_person_id` instead of skipping.

3. **Scheduling** — run the sync via a Fly scheduled machine / cron entry.

4. **Queue API** — `GET /api/integrations/outlook/queue` (list pending),
   `POST .../queue/[id]/resolve` with action `approve` | `merge` | `reject`.
   Approve creates a `people` row and applies a chosen category
   (Investor/Customer/Talent) + optional org. Reuses `createPerson`.

5. **Review UI** — a queue page: per contact, approve (with category/org
   picker — that's the "where"), merge into existing person, or reject.

### Deliverable
New Outlook contacts appear in a queue; Charles triages each into the CRM.

### Acceptance
- Adding a contact in Outlook surfaces it in the queue within one sync cycle.
- Approve creates a categorized person; merge/reject resolve without creating
  duplicates; re-running sync does not re-queue resolved contacts.

---

## Phase 2 — Email Inbox Surface

Email surfacing has **two alternative tracks** — they are not both required:

- **Track A (this section)** — full mailbox sync via Microsoft Graph OAuth.
  Surfaces inbound *and* sent mail passively. Highest value, highest privacy
  footprint, depends on Phase 0.
- **Track B (next section)** — BCC ingestion. Captures only emails Charles
  deliberately BCCs (outbound / introduction emails). Minimal privacy
  footprint, no OAuth, no Phase 0 dependency.

Recommendation: ship **Track B** first as a low-risk way to deliver
introduction-linking, then treat Track A as a separate go/no-go if passive
inbound surfacing turns out to matter.

### Tasks

1. **Data model** — metadata only:
   ```sql
   CREATE TABLE IF NOT EXISTS emails (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     graph_id TEXT NOT NULL UNIQUE,
     folder TEXT NOT NULL,              -- inbox|sent
     from_addr TEXT,
     from_name TEXT,
     subject TEXT,
     snippet TEXT,
     sent_at TEXT,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE TABLE IF NOT EXISTS email_recipients (
     email_id INTEGER NOT NULL,
     kind TEXT NOT NULL,                -- to|cc
     address TEXT,
     name TEXT,
     person_id INTEGER,
     PRIMARY KEY (email_id, kind, address),
     FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
     FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL
   );
   ```

2. **Mail sync job** — extend the sync to `/me/mailFolders/inbox/messages/delta`
   and `…/sentitems/messages/delta`. Store metadata + recipients; resolve
   `person_id` for each recipient by email match.

3. **Inbox UI** — a page listing recent inbound/sent messages. Opening a message
   fetches the body on demand via `graphFetch`.

4. **Recipient linking**:
   - Unmatched recipient → one-click "add to import queue" (feeds Phase 1).
   - Matched recipients → "Log introduction" action, pre-filled with those
     people, date, medium = Email, wired into the existing `interactions` flow.

5. **Intro detection** — flag messages with ≥2 known-person recipients and a
   subject matching `/intro|introduction|connecting/i`; pin them to the top of
   the inbox as "looks like an introduction — log it?"

6. **Consent** — the connect flow must state that mail metadata will be synced;
   optionally scope sync to messages with at least one matching recipient.

### Deliverable
Charles browses recent mail in-app and logs introductions from it in one click.

### Acceptance
- Inbound and sent messages appear after a sync.
- Recipients show matched/unmatched status; matched messages offer prefilled
  introduction logging; intro-like emails are surfaced first.

---

## Phase 2 — Alternative Track: BCC Email Ingestion

The "BCC-to-CRM" pattern: Charles BCCs a dedicated intake address on emails he
wants logged; those emails are ingested as introduction suggestions. No OAuth,
no mailbox access — the app only ever sees emails Charles deliberately copies.

### Scope limitation

BCC captures **outbound email only** — messages Charles *sends*. He cannot BCC
mail he *receives*; passive inbound surfacing is not possible with this track
(an Outlook server-side rule auto-forwarding selected inbound mail to the
intake address is the only partial workaround). This track fully serves the
introduction-logging goal; it does not replace Track A's passive inbox view.

### Friction tradeoff (decision point for Charles)

BCC is a **manual per-email step** — Charles must add the intake address when
he wants an email logged. Mitigations: it applies only to introduction emails
(not all mail), and friction drops to ~one keystroke if the intake address is
saved as a contact, or to zero with an Outlook auto-BCC add-in.

The catch: the deliberate BCC *is* the privacy boundary — it's what scopes the
CRM to only the emails Charles chooses. Fully automating it (auto-BCC
everything) effectively recreates full-mailbox access, at which point Track A
is the cleaner way to get there. So the choice is:

- "A small deliberate step per introduction is acceptable" → **Track B**.
- "It must be zero extra effort, ever" → **Track A** (OAuth full sync).

### Implementation options

- **Option A — inbound-email provider webhook (recommended).** Use an inbound
  provider — check Resend's inbound feature first since outbound already runs
  through Resend; otherwise Postmark offers a free inbound address
  (`x@inbound.postmarkapp.com`) with zero DNS setup. The provider POSTs parsed
  email JSON to a webhook. No mailbox, no licensing cost.
- **Option B — dedicated M365 mailbox.** A licensed mailbox
  (`intros@charlesdomain.com`, ~$6/mo + domain) read via Graph **application**
  permissions, locked to that one mailbox by an Exchange **Application Access
  Policy**. Stronger scoping story but more infrastructure; admin consent
  required. Only worth it if a real mailbox (e.g. for forwarded inbound) is
  wanted.

### Tasks (Option A)

1. **Provision the intake address** — confirm Resend inbound capability or
   create a Postmark inbound address. New env var `INBOUND_EMAIL_SECRET` (the
   provider's webhook signing secret).

2. **Data model** — reuse `emails` / `email_recipients` from Track A, with
   `folder = 'bcc'`. Add an intro-suggestion table:
   ```sql
   CREATE TABLE IF NOT EXISTS intro_suggestions (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email_id INTEGER NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending',  -- pending|logged|dismissed
     interaction_id INTEGER,                  -- set when logged
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     resolved_at TEXT,
     FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
     FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE SET NULL
   );
   ```

3. **Webhook route** — `POST /api/integrations/inbound-email`:
   - Verify the provider's signature against `INBOUND_EMAIL_SECRET`.
   - **Accept only mail whose `from` matches Charles's known address(es)** —
     the intake address is public; this prevents forged introductions.
   - Parse To/CC, store an `emails` row + recipients, match recipients against
     `people` (reuse `findPersonByEmail`), create an `intro_suggestion`.

4. **Suggestion review UI** — a list of pending suggestions. Each shows the
   email subject, matched/unmatched recipients, and a **"Log introduction"**
   action pre-filled with the matched people, date, medium = Email — wired into
   the existing `interactions` flow. Unmatched recipients link to the Phase 1
   import queue. Dismiss closes a suggestion without logging.

### Deliverable
Charles BCCs the intake address on an introduction email and finds it waiting
as a one-click introduction-logging suggestion.

### Acceptance
- A BCC'd email from Charles produces a pending `intro_suggestion`.
- Mail from a non-Charles sender is rejected.
- "Log introduction" creates an `interactions` row with the matched people and
  marks the suggestion `logged`; dismiss marks it `dismissed`.
- A duplicate delivery of the same message does not create a second suggestion.

---

## Phase 3 — Polish & Hardening

- Backfill UI (initial historical sync with progress + 429 backoff).
- Sync status surface (last run, errors) in settings.
- Token-refresh failure handling → prompt re-connect.
- Tests: OAuth callback, token refresh, dedup logic, queue resolution, intro
  detection (follow red-green TDD).

## Phase 4 — Webhooks (optional, real-time)

- `POST /api/integrations/outlook/notifications` handling the Graph validation
  handshake and change notifications.
- `/subscriptions` for contacts + mail folders.
- Scheduled subscription renewal (mail subscriptions expire ~3 days).
- Keep the delta poll as a safety-net reconciler.

---

## Risks & Notes

- **Entra account type** must match Charles's mailbox or consent fails.
- **Refresh-token rotation**: tokens are replicated to Tigris — encryption is
  non-negotiable; rotating `TOKEN_ENC_KEY` requires re-connecting.
- **Graph throttling (429)**: backfill must back off; live sync stays small.
- **Privacy**: Phase 2 ingests a personal mailbox — explicit consent required.
- **Background processing**: the app is a single Fly machine; the sync job runs
  as a scheduled machine, separate from the web process.
