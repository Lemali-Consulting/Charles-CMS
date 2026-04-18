#!/usr/bin/env node
/*
 * Parse "Suggested People - Charles Mansfield.csv" into a deduped people.json
 * ready for import. Drops generic inbox / system / calendar-ID emails.
 *
 * Usage:
 *   node scripts/import-suggested-people.js \
 *     ../"Suggested People - Charles Mansfield.csv" \
 *     people.json
 */

const fs = require("fs");
const path = require("path");

const GENERIC_LOCAL_PARTS = new Set([
  "info", "contact", "hello", "hi", "sales", "support", "admin",
  "noreply", "no-reply", "donotreply", "do-not-reply",
  "team", "office", "marketing", "press", "media", "help", "events",
  "hr", "careers", "jobs", "billing", "accounts", "service", "general",
  "inquiries", "enquiries", "feedback", "customer", "reception",
  "notifications", "notify", "alerts", "newsletter", "updates",
  "postmaster", "mailer-daemon", "unsubscribe",
]);

const SYSTEM_DOMAIN_SUFFIXES = [
  "calendar.google.com",          // group.calendar.google.com, resource.calendar.google.com
  "bouncelimited.com",
  "qemailserver.com",
];

function isNonUseful(email) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return true;
  if (GENERIC_LOCAL_PARTS.has(local)) return true;
  if (SYSTEM_DOMAIN_SUFFIXES.some((s) => domain.endsWith(s))) return true;
  return false;
}

// Split on the LAST comma so "Last, First,email" parses correctly.
function parseRow(line) {
  const idx = line.lastIndexOf(",");
  if (idx < 0) return null;
  const name = line.slice(0, idx).trim();
  const email = line.slice(idx + 1).trim().toLowerCase();
  if (!email.includes("@")) return null;
  return { name, email };
}

// Normalize "Last, First M" -> { first: "First M", last: "Last" }
// "First Last" -> { first: "First", last: "Last" }
// Single token -> { first: token, last: "" }
function splitName(rawName) {
  const name = rawName.replace(/\s+/g, " ").trim();
  if (!name) return { first_name: "", last_name: "" };
  // "Last, First" form
  if (name.includes(",")) {
    const [last, ...rest] = name.split(",");
    return {
      first_name: rest.join(",").trim(),
      last_name: last.trim(),
    };
  }
  const parts = name.split(" ");
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
}

// Prefer a name that looks human (letters + space) over one that is just an email.
function nameQualityScore(name) {
  if (!name) return -1;
  if (name.includes("@")) return 0;          // the name field is literally the email
  if (/^[A-Za-z][A-Za-z.'-]*(\s+[A-Za-z][A-Za-z.'-]*)+$/.test(name)) return 3;
  if (/[A-Za-z]/.test(name)) return 2;
  return 1;
}

function pickCanonicalName(variants) {
  // variants: Map<nameString, count>
  const entries = [...variants.entries()];
  entries.sort((a, b) => {
    const qa = nameQualityScore(a[0]);
    const qb = nameQualityScore(b[0]);
    if (qa !== qb) return qb - qa;
    if (a[1] !== b[1]) return b[1] - a[1];   // higher count first
    return b[0].length - a[0].length;         // longer first
  });
  return entries[0][0];
}

function main() {
  const [, , inPath, outPath] = process.argv;
  if (!inPath || !outPath) {
    console.error("Usage: node import-suggested-people.js <input.csv> <output.json>");
    process.exit(1);
  }
  const absIn = path.resolve(inPath);
  const absOut = path.resolve(outPath);

  const lines = fs.readFileSync(absIn, "utf8").split(/\r?\n/).filter(Boolean);

  const byEmail = new Map(); // email -> { nameVariants: Map, occurrences }
  let parsed = 0, skippedNonUseful = 0, skippedUnparseable = 0;

  for (const line of lines) {
    const row = parseRow(line);
    if (!row) { skippedUnparseable++; continue; }
    if (isNonUseful(row.email)) { skippedNonUseful++; continue; }
    parsed++;
    let entry = byEmail.get(row.email);
    if (!entry) {
      entry = { nameVariants: new Map(), occurrences: 0 };
      byEmail.set(row.email, entry);
    }
    entry.occurrences++;
    entry.nameVariants.set(row.name, (entry.nameVariants.get(row.name) || 0) + 1);
  }

  const people = [];
  for (const [email, entry] of byEmail.entries()) {
    const canonical = pickCanonicalName(entry.nameVariants);
    let { first_name, last_name } = splitName(canonical);
    let needs_review = false;
    // If the "name" is really just the email, derive a best guess from the
    // local part (e.g. caitlin.green@x -> "Caitlin Green") and flag for review.
    if (!first_name || first_name.includes("@") || last_name.includes("@")) {
      const local = email.split("@")[0];
      const tokens = local
        .split(/[._-]+/)
        .filter((t) => /[a-z]/i.test(t))
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
      if (tokens.length >= 2) {
        first_name = tokens.slice(0, -1).join(" ");
        last_name = tokens[tokens.length - 1];
      } else if (tokens.length === 1) {
        first_name = tokens[0];
        last_name = "";
      } else {
        first_name = local;
        last_name = "";
      }
      needs_review = true;
    }
    people.push({
      email,
      first_name,
      last_name,
      needs_review,
      occurrences: entry.occurrences,
      name_variants: [...entry.nameVariants.keys()],
    });
  }

  // Stable sort: most-seen first, then alpha by email
  people.sort((a, b) => b.occurrences - a.occurrences || a.email.localeCompare(b.email));

  fs.writeFileSync(absOut, JSON.stringify(people, null, 2) + "\n");

  console.log(`Input lines:        ${lines.length}`);
  console.log(`Parsed rows:        ${parsed}`);
  console.log(`Skipped unparseable:${skippedUnparseable}`);
  console.log(`Skipped non-useful: ${skippedNonUseful}`);
  console.log(`Unique people:      ${people.length}`);
  console.log(`Wrote:              ${absOut}`);
}

main();
