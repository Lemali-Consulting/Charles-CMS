#!/usr/bin/env node

/**
 * Import people from a JSON file (produced by scripts/import-suggested-people.js)
 * directly into the SQLite database. Mirrors the logic in the
 * POST /api/people/import route but talks to the DB directly, so it's meant to
 * be run locally or via `fly ssh console` (same access pattern as seed.js).
 *
 * Usage:
 *   node scripts/import-people.js people.json                  # local
 *   node scripts/import-people.js people.json --dry-run        # no writes
 *   DB_DIR=/data node scripts/import-people.js people.json     # Fly volume
 *
 * Idempotent:
 *   - Skips rows whose email already exists (case-insensitive).
 *   - Skips rows whose (first_name, last_name) pair already exists (UNIQUE).
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const input = args.find((a) => !a.startsWith("--"));
if (!input) {
  console.error("Usage: node scripts/import-people.js <people.json> [--dry-run]");
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(path.resolve(input), "utf8"));
if (!Array.isArray(rows)) {
  console.error("Input must be a JSON array");
  process.exit(1);
}

const DB_PATH = path.join(process.env.DB_DIR || process.cwd(), "crm.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Ensure the people table exists (mirrors src/lib/db.ts::initSchema). Lets the
// script run against a brand-new /data volume before the Next app has booted.
db.exec(`
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT DEFAULT '',
    linkedin_url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(first_name, last_name)
  );
`);

const findByEmail = db.prepare(
  "SELECT id FROM people WHERE LOWER(email) = ? LIMIT 1"
);
const findByName = db.prepare(
  "SELECT id FROM people WHERE first_name = ? AND last_name = ? LIMIT 1"
);
const insertPerson = db.prepare(`
  INSERT INTO people (first_name, last_name, email, linkedin_url, notes)
  VALUES (@first_name, @last_name, @email, @linkedin_url, @notes)
`);

let inserted = 0;
let skippedDuplicateEmail = 0;
let skippedDuplicateName = 0;
let skippedInvalid = 0;
const errors = [];

const tx = db.transaction((rowsToProcess) => {
  for (let i = 0; i < rowsToProcess.length; i++) {
    const r = rowsToProcess[i];
    const first = (r.first_name || "").trim();
    const last = (r.last_name || "").trim();
    const email = (r.email || "").trim().toLowerCase();

    if (!first && !last) {
      skippedInvalid++;
      continue;
    }
    if (email && findByEmail.get(email)) {
      skippedDuplicateEmail++;
      continue;
    }
    const fn = first || "(unknown)";
    const ln = last || "(unknown)";
    if (findByName.get(fn, ln)) {
      skippedDuplicateName++;
      continue;
    }

    try {
      insertPerson.run({
        first_name: fn,
        last_name: ln,
        email,
        linkedin_url: "",
        notes: r.notes || "",
      });
      inserted++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE")) {
        skippedDuplicateName++;
      } else {
        errors.push({ index: i, email, error: msg });
      }
    }
  }

  if (dryRun) {
    throw new Error("__DRY_RUN_ROLLBACK__");
  }
});

try {
  tx(rows);
} catch (e) {
  if (!(e instanceof Error) || e.message !== "__DRY_RUN_ROLLBACK__") throw e;
}

console.log(`DB:                      ${DB_PATH}`);
console.log(`Mode:                    ${dryRun ? "DRY RUN (rolled back)" : "WRITE"}`);
console.log(`Input rows:              ${rows.length}`);
console.log(`Inserted:                ${inserted}`);
console.log(`Skipped (email exists):  ${skippedDuplicateEmail}`);
console.log(`Skipped (name exists):   ${skippedDuplicateName}`);
console.log(`Skipped (invalid):       ${skippedInvalid}`);
console.log(`Errors:                  ${errors.length}`);
if (errors.length) {
  console.log("First 5 errors:");
  errors.slice(0, 5).forEach((e) => console.log(" ", e));
}
