#!/usr/bin/env node

/**
 * Seed script for the Introduction Tracker.
 * Populates the database with realistic test data:
 *   ~100 people, ~15 organizations, ~20 introductions, ~25 relationships
 *
 * Usage:
 *   node scripts/seed.js              # seeds crm.db in cwd
 *   DB_DIR=/data node scripts/seed.js # seeds /data/crm.db (for Fly.io)
 *
 * The script is idempotent — it checks if data already exists before inserting.
 */

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(process.env.DB_DIR || process.cwd(), "crm.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema (mirrors src/lib/db.ts initSchema) ────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS org_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    org_type_id INTEGER,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (org_type_id) REFERENCES org_types(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS person_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
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
  CREATE TABLE IF NOT EXISTS person_category_links (
    person_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (person_id, category_id),
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES person_categories(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS interaction_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS interaction_mediums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_type_id INTEGER NOT NULL,
    medium_id INTEGER,
    date TEXT NOT NULL DEFAULT (date('now')),
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (interaction_type_id) REFERENCES interaction_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (medium_id) REFERENCES interaction_mediums(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS interaction_people (
    interaction_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    PRIMARY KEY (interaction_id, person_id),
    FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS interaction_organizations (
    interaction_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    PRIMARY KEY (interaction_id, organization_id),
    FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS person_person_relationship_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS relationships_person_person (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_1_id INTEGER NOT NULL,
    person_2_id INTEGER NOT NULL,
    relationship_type_id INTEGER,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (person_1_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (person_2_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (relationship_type_id) REFERENCES person_person_relationship_types(id) ON DELETE SET NULL,
    UNIQUE(person_1_id, person_2_id),
    CHECK(person_1_id < person_2_id)
  );
  CREATE TABLE IF NOT EXISTS org_person_relationship_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS relationships_org_person (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    relationship_type_id INTEGER,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (relationship_type_id) REFERENCES org_person_relationship_types(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS org_org_relationship_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS relationships_org_org (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_1_id INTEGER NOT NULL,
    org_2_id INTEGER NOT NULL,
    relationship_type_id INTEGER,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (org_1_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (org_2_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (relationship_type_id) REFERENCES org_org_relationship_types(id) ON DELETE SET NULL,
    UNIQUE(org_1_id, org_2_id),
    CHECK(org_1_id < org_2_id)
  );
  CREATE INDEX IF NOT EXISTS idx_interactions_date ON interactions(date DESC);
  CREATE INDEX IF NOT EXISTS idx_people_name ON people(last_name, first_name);
  CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
`);

// Seed default lookup values (same as db.ts initSchema)
const typeCount = db.prepare("SELECT COUNT(*) as c FROM interaction_types").get().c;
if (typeCount === 0) {
  db.prepare("INSERT INTO interaction_types (name) VALUES (?)").run("Introduction");
}
const mediumCount = db.prepare("SELECT COUNT(*) as c FROM interaction_mediums").get().c;
if (mediumCount === 0) {
  const ins = db.prepare("INSERT INTO interaction_mediums (name) VALUES (?)");
  for (const n of ["Email", "In Person", "Phone", "Video Call", "LinkedIn", "Other"]) ins.run(n);
}
const catCount = db.prepare("SELECT COUNT(*) as c FROM person_categories").get().c;
if (catCount === 0) {
  const ins = db.prepare("INSERT INTO person_categories (name) VALUES (?)");
  for (const n of ["Investor", "Customer", "Talent"]) ins.run(n);
}
db.prepare("INSERT OR IGNORE INTO person_person_relationship_types (name) VALUES ('Introduced')").run();

// ── Helpers ──────────────────────────────────────────────

function getOrCreateLookup(table, name) {
  let row = db.prepare(`SELECT id FROM ${table} WHERE name = ?`).get(name);
  if (!row) {
    const result = db.prepare(`INSERT INTO ${table} (name) VALUES (?)`).run(name);
    row = { id: result.lastInsertRowid };
  }
  return row.id;
}

function insertPerson(first, last, email, linkedin, notes, categories) {
  const existing = db.prepare("SELECT id FROM people WHERE first_name = ? AND last_name = ?").get(first, last);
  if (existing) return existing.id;

  const result = db.prepare(
    "INSERT INTO people (first_name, last_name, email, linkedin_url, notes) VALUES (?, ?, ?, ?, ?)"
  ).run(first, last, email || "", linkedin || "", notes || "");
  const personId = result.lastInsertRowid;

  if (categories && categories.length > 0) {
    for (const catName of categories) {
      const cat = db.prepare("SELECT id FROM person_categories WHERE name = ?").get(catName);
      if (cat) {
        db.prepare("INSERT OR IGNORE INTO person_category_links (person_id, category_id) VALUES (?, ?)").run(personId, cat.id);
      }
    }
  }
  return personId;
}

function insertOrg(name, typeName, notes) {
  const existing = db.prepare("SELECT id FROM organizations WHERE name = ?").get(name);
  if (existing) return existing.id;

  const typeId = typeName ? getOrCreateLookup("org_types", typeName) : null;
  const result = db.prepare(
    "INSERT INTO organizations (name, org_type_id, notes) VALUES (?, ?, ?)"
  ).run(name, typeId, notes || "");
  return result.lastInsertRowid;
}

function insertIntroduction(personIds, mediumName, date, notes) {
  const introTypeId = getOrCreateLookup("interaction_types", "Introduction");
  const mediumId = mediumName ? getOrCreateLookup("interaction_mediums", mediumName) : null;

  const result = db.prepare(
    "INSERT INTO interactions (interaction_type_id, medium_id, date, notes) VALUES (?, ?, ?, ?)"
  ).run(introTypeId, mediumId, date, notes || "");
  const introId = result.lastInsertRowid;

  const linkStmt = db.prepare("INSERT INTO interaction_people (interaction_id, person_id) VALUES (?, ?)");
  for (const pid of personIds) {
    linkStmt.run(introId, pid);
  }

  // Auto-create "Introduced" relationships
  const introducedTypeId = getOrCreateLookup("person_person_relationship_types", "Introduced");
  for (let i = 0; i < personIds.length; i++) {
    for (let j = i + 1; j < personIds.length; j++) {
      const [p1, p2] = personIds[i] < personIds[j]
        ? [personIds[i], personIds[j]]
        : [personIds[j], personIds[i]];
      const existing = db.prepare(
        "SELECT id FROM relationships_person_person WHERE person_1_id = ? AND person_2_id = ?"
      ).get(p1, p2);
      if (!existing) {
        db.prepare(
          "INSERT INTO relationships_person_person (person_1_id, person_2_id, relationship_type_id) VALUES (?, ?, ?)"
        ).run(p1, p2, introducedTypeId);
      }
    }
  }

  return introId;
}

function insertPersonPersonRelationship(personId1, personId2, typeName, notes) {
  const [p1, p2] = personId1 < personId2 ? [personId1, personId2] : [personId2, personId1];
  const existing = db.prepare(
    "SELECT id FROM relationships_person_person WHERE person_1_id = ? AND person_2_id = ?"
  ).get(p1, p2);
  if (existing) return existing.id;

  const typeId = typeName ? getOrCreateLookup("person_person_relationship_types", typeName) : null;
  const result = db.prepare(
    "INSERT INTO relationships_person_person (person_1_id, person_2_id, relationship_type_id, notes) VALUES (?, ?, ?, ?)"
  ).run(p1, p2, typeId, notes || "");
  return result.lastInsertRowid;
}

function insertOrgPersonRelationship(orgId, personId, typeName, notes) {
  const existing = db.prepare(
    "SELECT id FROM relationships_org_person WHERE organization_id = ? AND person_id = ?"
  ).get(orgId, personId);
  if (existing) return existing.id;

  const typeId = typeName ? getOrCreateLookup("org_person_relationship_types", typeName) : null;
  const result = db.prepare(
    "INSERT INTO relationships_org_person (organization_id, person_id, relationship_type_id, notes) VALUES (?, ?, ?, ?)"
  ).run(orgId, personId, typeId, notes || "");
  return result.lastInsertRowid;
}

function insertOrgOrgRelationship(orgId1, orgId2, typeName, notes) {
  const [o1, o2] = orgId1 < orgId2 ? [orgId1, orgId2] : [orgId2, orgId1];
  const existing = db.prepare(
    "SELECT id FROM relationships_org_org WHERE org_1_id = ? AND org_2_id = ?"
  ).get(o1, o2);
  if (existing) return existing.id;

  const typeId = typeName ? getOrCreateLookup("org_org_relationship_types", typeName) : null;
  const result = db.prepare(
    "INSERT INTO relationships_org_org (org_1_id, org_2_id, relationship_type_id, notes) VALUES (?, ?, ?, ?)"
  ).run(o1, o2, typeId, notes || "");
  return result.lastInsertRowid;
}

// ── Check if already seeded ──────────────────────────────

const peopleCount = db.prepare("SELECT COUNT(*) as c FROM people").get().c;
if (peopleCount >= 50) {
  console.log(`Database already has ${peopleCount} people — skipping seed.`);
  process.exit(0);
}

console.log("Seeding database...");

// ── Relationship types ───────────────────────────────────

const ppTypes = ["Introduced", "Colleague", "Co-founder", "Mentor", "Friends"];
for (const t of ppTypes) getOrCreateLookup("person_person_relationship_types", t);

const opTypes = ["Founder", "Employee", "Advisor", "Board Member", "Investor"];
for (const t of opTypes) getOrCreateLookup("org_person_relationship_types", t);

const ooTypes = ["Partner", "Investor", "Portfolio Company", "Competitor"];
for (const t of ooTypes) getOrCreateLookup("org_org_relationship_types", t);

// ── Organizations (15) ───────────────────────────────────

const orgs = {};

orgs.sequoia = insertOrg("Sequoia Capital", "Venture Capital", "Leading VC firm, early-stage to growth");
orgs.a16z = insertOrg("Andreessen Horowitz", "Venture Capital", "Major VC with crypto and bio funds");
orgs.accel = insertOrg("Accel Partners", "Venture Capital", "Global VC, early and growth stage");
orgs.yc = insertOrg("Y Combinator", "Accelerator", "Top startup accelerator");
orgs.techstars = insertOrg("Techstars", "Accelerator", "Global accelerator network");
orgs.stripe = insertOrg("Stripe", "Technology", "Payments infrastructure for the internet");
orgs.notion = insertOrg("Notion", "Technology", "All-in-one workspace");
orgs.figma = insertOrg("Figma", "Technology", "Collaborative design tool");
orgs.linear = insertOrg("Linear", "Technology", "Project management for software teams");
orgs.vercel = insertOrg("Vercel", "Technology", "Frontend cloud platform");
orgs.mercury = insertOrg("Mercury", "Fintech", "Banking for startups");
orgs.ramp = insertOrg("Ramp", "Fintech", "Corporate card and spend management");
orgs.openai = insertOrg("OpenAI", "AI/ML", "AI research and deployment company");
orgs.anthropic = insertOrg("Anthropic", "AI/ML", "AI safety company");
orgs.databricks = insertOrg("Databricks", "Data/Analytics", "Unified analytics platform");

// ── People (100) ─────────────────────────────────────────

const people = {};

// Investors (35)
const investors = [
  ["Michael", "Moritz", "m.moritz@sequoiacap.example.com", "", "Former Sequoia chairman"],
  ["Alfred", "Lin", "a.lin@sequoiacap.example.com", "", "Sequoia partner, former Zappos COO"],
  ["Marc", "Andreessen", "marc@a16z.example.com", "", "Co-founder a16z, Netscape"],
  ["Ben", "Horowitz", "ben@a16z.example.com", "", "Co-founder a16z"],
  ["Sameer", "Gandhi", "sameer@accel.example.com", "", "Accel partner"],
  ["Rich", "Wong", "rich@accel.example.com", "", "Accel partner"],
  ["Garry", "Tan", "garry@yc.example.com", "", "Y Combinator CEO"],
  ["Dalton", "Caldwell", "dalton@yc.example.com", "", "YC managing director"],
  ["David", "Cohen", "david@techstars.example.com", "", "Techstars co-founder"],
  ["Sarah", "Chen", "sarah.chen@example.com", "", "Angel investor, ex-Google"],
  ["Priya", "Sharma", "priya@example.com", "", "Angel investor, fintech focused"],
  ["James", "Park", "james.park@example.com", "", "Seed-stage investor"],
  ["Elena", "Rodriguez", "elena.r@example.com", "", "Climate tech investor"],
  ["Thomas", "Mueller", "thomas.m@example.com", "", "Deep tech investor, PhD physics"],
  ["Lisa", "Wang", "lisa.wang@example.com", "", "Series A investor, SaaS focused"],
  ["Robert", "Kim", "robert.k@example.com", "", "Growth equity investor"],
  ["Amanda", "Foster", "amanda.f@example.com", "", "Impact investor"],
  ["Nathan", "Brooks", "nathan.b@example.com", "", "Crypto and web3 investor"],
  ["Diana", "Patel", "diana.p@example.com", "", "Healthcare investor"],
  ["Marcus", "Johnson", "marcus.j@example.com", "", "Real estate tech investor"],
  ["Sophia", "Lee", "sophia.l@example.com", "", "EdTech angel investor"],
  ["Kevin", "Wright", "kevin.w@example.com", "", "B2B SaaS investor"],
  ["Rachel", "Torres", "rachel.t@example.com", "", "Early-stage consumer investor"],
  ["Daniel", "Nakamura", "daniel.n@example.com", "", "Deeptech and robotics"],
  ["Catherine", "Bell", "catherine.b@example.com", "", "Biotech investor"],
  ["Andrew", "Singh", "andrew.s@example.com", "", "Infrastructure investor"],
  ["Michelle", "Zhao", "michelle.z@example.com", "", "AI/ML focused investor"],
  ["Patrick", "O'Brien", "patrick.o@example.com", "", "Pre-seed investor"],
  ["Jessica", "Huang", "jessica.h@example.com", "", "Marketplace investor"],
  ["Ryan", "Adams", "ryan.a@example.com", "", "Fintech growth investor"],
  ["Nina", "Kapoor", "nina.k@example.com", "", "Climate and energy investor"],
  ["Chris", "Taylor", "chris.t@example.com", "", "Enterprise software investor"],
  ["Laura", "Martinez", "laura.m@example.com", "", "Consumer social investor"],
  ["Victor", "Petrov", "victor.p@example.com", "", "Emerging markets investor"],
  ["Hannah", "Green", "hannah.g@example.com", "", "Supply chain tech investor"],
];

for (const [first, last, email, linkedin, notes] of investors) {
  people[`${first.toLowerCase()}_${last.toLowerCase()}`] = insertPerson(first, last, email, linkedin, notes, ["Investor"]);
}

// Customers (35)
const customers = [
  ["Emily", "Thompson", "emily.t@stripe.example.com", "", "VP Product at Stripe"],
  ["Jason", "Wu", "jason.w@notion.example.com", "", "Head of Growth at Notion"],
  ["Maria", "Santos", "maria.s@figma.example.com", "", "Dir of Sales at Figma"],
  ["David", "Park", "david.p@linear.example.com", "", "CEO at Linear"],
  ["Jennifer", "Chang", "jennifer.c@vercel.example.com", "", "CTO at Vercel"],
  ["Alex", "Rivera", "alex.r@mercury.example.com", "", "Head of BD at Mercury"],
  ["Brian", "Foster", "brian.f@ramp.example.com", "", "VP Sales at Ramp"],
  ["Olivia", "Kim", "olivia.k@openai.example.com", "", "Dir of Partnerships at OpenAI"],
  ["Steven", "Hall", "steven.h@anthropic.example.com", "", "BD Lead at Anthropic"],
  ["Angela", "Liu", "angela.l@databricks.example.com", "", "VP Enterprise at Databricks"],
  ["Michael", "Brown", "michael.b@acme.example.com", "", "CTO at Acme Corp"],
  ["Samantha", "Davis", "samantha.d@example.com", "", "Founder, Series B startup"],
  ["Christopher", "Lee", "chris.lee@example.com", "", "Head of Product, fintech startup"],
  ["Amy", "Nguyen", "amy.n@example.com", "", "VP Engineering, e-commerce"],
  ["Derek", "Williams", "derek.w@example.com", "", "CEO, logistics startup"],
  ["Nicole", "Anderson", "nicole.a@example.com", "", "Head of Marketing, DTC brand"],
  ["Gregory", "Jackson", "greg.j@example.com", "", "COO, healthcare platform"],
  ["Tiffany", "Chen", "tiffany.c@example.com", "", "CPO, developer tools"],
  ["Brandon", "Miller", "brandon.m@example.com", "", "Founder, AI startup"],
  ["Katherine", "White", "katherine.w@example.com", "", "Dir of Ops, manufacturing"],
  ["Omar", "Hassan", "omar.h@example.com", "", "CEO, proptech startup"],
  ["Stephanie", "Clark", "steph.c@example.com", "", "VP Product, enterprise SaaS"],
  ["Raymond", "Chung", "ray.c@example.com", "", "CTO, cybersecurity"],
  ["Monica", "Reyes", "monica.r@example.com", "", "Head of Sales, marketplace"],
  ["Tyler", "Bennett", "tyler.b@example.com", "", "Founder, climate tech"],
  ["Heather", "Scott", "heather.s@example.com", "", "VP BD, data platform"],
  ["Justin", "Yang", "justin.y@example.com", "", "CEO, healthtech"],
  ["Lauren", "Martin", "lauren.m@example.com", "", "Head of Growth, consumer app"],
  ["Carlos", "Fernandez", "carlos.f@example.com", "", "Dir of Engineering, media"],
  ["Ashley", "Robinson", "ashley.r@example.com", "", "COO, edtech startup"],
  ["Peter", "Zhang", "peter.z@example.com", "", "CTO, supply chain"],
  ["Rebecca", "Evans", "rebecca.e@example.com", "", "VP Product, fintech"],
  ["Sean", "Murphy", "sean.m@example.com", "", "Founder, robotics startup"],
  ["Christine", "Lam", "christine.l@example.com", "", "Head of Eng, real estate tech"],
  ["Tony", "Russo", "tony.r@example.com", "", "CEO, food delivery platform"],
];

for (const [first, last, email, linkedin, notes] of customers) {
  people[`${first.toLowerCase()}_${last.toLowerCase()}`] = insertPerson(first, last, email, linkedin, notes, ["Customer"]);
}

// Talent (30)
const talent = [
  ["Sophie", "Andersen", "sophie.a@example.com", "", "Senior ML engineer, ex-Google Brain"],
  ["Raj", "Patel", "raj.p@example.com", "", "Full-stack engineer, startup experience"],
  ["Maya", "Johnson", "maya.j@example.com", "", "Product designer, ex-Airbnb"],
  ["Lucas", "Weber", "lucas.w@example.com", "", "Backend engineer, distributed systems"],
  ["Aisha", "Mohammed", "aisha.m@example.com", "", "Data scientist, NLP specialist"],
  ["Erik", "Johansson", "erik.j@example.com", "", "DevOps engineer, cloud infrastructure"],
  ["Yuki", "Tanaka", "yuki.t@example.com", "", "iOS engineer, ex-Apple"],
  ["Fatima", "Al-Hassan", "fatima.a@example.com", "", "Security engineer, ex-CrowdStrike"],
  ["Leo", "Costa", "leo.c@example.com", "", "Frontend engineer, React specialist"],
  ["Ingrid", "Nilsen", "ingrid.n@example.com", "", "Product manager, B2B SaaS"],
  ["Diego", "Morales", "diego.m@example.com", "", "ML ops engineer"],
  ["Zara", "Khan", "zara.k@example.com", "", "UX researcher, enterprise products"],
  ["Mateo", "Garcia", "mateo.g@example.com", "", "Android engineer, Kotlin expert"],
  ["Nia", "Williams", "nia.w@example.com", "", "Engineering manager, growth teams"],
  ["Oscar", "Berg", "oscar.b@example.com", "", "Embedded systems engineer"],
  ["Lena", "Fischer", "lena.f@example.com", "", "Data engineer, Spark/Kafka"],
  ["Arjun", "Reddy", "arjun.r@example.com", "", "Blockchain engineer, Solidity"],
  ["Clara", "Dubois", "clara.d@example.com", "", "Technical writer, API docs"],
  ["Hassan", "Ibrahim", "hassan.i@example.com", "", "QA engineer, test automation"],
  ["Mia", "Svensson", "mia.s@example.com", "", "Backend engineer, Go and Rust"],
  ["Kai", "Nakamura", "kai.n@example.com", "", "Site reliability engineer"],
  ["Amara", "Okafor", "amara.o@example.com", "", "Product manager, consumer apps"],
  ["Felix", "Koenig", "felix.k@example.com", "", "Systems architect, ex-AWS"],
  ["Isla", "MacLeod", "isla.m@example.com", "", "Growth marketer, PLG expert"],
  ["Ravi", "Sharma", "ravi.s@example.com", "", "Data scientist, recommendation systems"],
  ["Chloe", "Petit", "chloe.p@example.com", "", "Designer, design systems"],
  ["Noah", "Lindqvist", "noah.l@example.com", "", "Platform engineer, Kubernetes"],
  ["Priya", "Gupta", "priya.g@example.com", "", "ML engineer, computer vision"],
  ["Sam", "O'Connor", "sam.o@example.com", "", "Full-stack engineer, TypeScript"],
  ["Freya", "Eriksson", "freya.e@example.com", "", "VP of Engineering candidate"],
];

for (const [first, last, email, linkedin, notes] of talent) {
  people[`${first.toLowerCase()}_${last.toLowerCase()}`] = insertPerson(first, last, email, linkedin, notes, ["Talent"]);
}

// Collect all person IDs by category for easier intro/relationship creation
const investorIds = investors.map(([f, l]) => people[`${f.toLowerCase()}_${l.toLowerCase()}`]);
const customerIds = customers.map(([f, l]) => people[`${f.toLowerCase()}_${l.toLowerCase()}`]);
const talentIds = talent.map(([f, l]) => people[`${f.toLowerCase()}_${l.toLowerCase()}`]);

// ── Introductions (20) ───────────────────────────────────
// Spread across the last 6 months

const introductions = [
  // Investor-to-Customer intros
  { people: [investorIds[0], customerIds[0]], medium: "Email", date: "2025-11-05", notes: "Connected Michael with Emily re: Stripe partnership opportunities" },
  { people: [investorIds[2], customerIds[1]], medium: "In Person", date: "2025-11-18", notes: "Marc met Jason at a16z event, intro to Notion team" },
  { people: [investorIds[6], customerIds[11]], medium: "Email", date: "2025-12-02", notes: "Garry introduced Samantha for YC batch consideration" },
  { people: [investorIds[9], customerIds[3]], medium: "Video Call", date: "2025-12-15", notes: "Sarah connected with David Park about Linear's next round" },
  { people: [investorIds[14], customerIds[18]], medium: "Email", date: "2026-01-08", notes: "Lisa intro'd to Brandon's AI startup for Series A" },

  // Investor-to-Talent intros
  { people: [investorIds[4], talentIds[0]], medium: "LinkedIn", date: "2025-12-20", notes: "Sameer connected Sophie with a portfolio company looking for ML talent" },
  { people: [investorIds[10], talentIds[9]], medium: "Email", date: "2026-01-12", notes: "Priya connected Ingrid with fintech portfolio company for PM role" },
  { people: [investorIds[20], talentIds[3]], medium: "Email", date: "2026-01-25", notes: "Sophia intro'd Lucas to an edtech startup needing backend help" },

  // Customer-to-Talent intros
  { people: [customerIds[0], talentIds[1]], medium: "Email", date: "2026-02-03", notes: "Emily referred Raj for a role at Stripe" },
  { people: [customerIds[7], talentIds[4]], medium: "Video Call", date: "2026-02-14", notes: "Olivia connected Aisha with OpenAI's NLP team" },
  { people: [customerIds[16], talentIds[13]], medium: "In Person", date: "2026-02-22", notes: "Gregory intro'd Nia for eng manager role at healthcare platform" },

  // Customer-to-Customer intros
  { people: [customerIds[2], customerIds[5]], medium: "Email", date: "2026-03-01", notes: "Maria connected Alex re: Mercury/Figma integration opportunity" },
  { people: [customerIds[9], customerIds[25]], medium: "In Person", date: "2026-03-10", notes: "Angela introduced Heather at a data conference" },

  // Three-way intros
  { people: [investorIds[3], customerIds[4], talentIds[21]], medium: "Email", date: "2026-03-15", notes: "Ben connected Jennifer and Amara for a product role at Vercel" },
  { people: [investorIds[8], customerIds[14], talentIds[7]], medium: "Video Call", date: "2026-03-20", notes: "David connected Tyler and Fatima for security consulting" },

  // More recent intros
  { people: [investorIds[26], customerIds[22]], medium: "Email", date: "2026-03-25", notes: "Michelle intro to Raymond's cybersecurity company" },
  { people: [investorIds[11], customerIds[20]], medium: "Phone", date: "2026-04-01", notes: "James connected with Omar about proptech investment" },
  { people: [customerIds[6], talentIds[22]], medium: "Email", date: "2026-04-04", notes: "Brian referred Felix for a systems architect role at Ramp" },
  { people: [investorIds[15], customerIds[31]], medium: "LinkedIn", date: "2026-04-08", notes: "Robert intro'd Rebecca for growth equity discussion" },
  { people: [investorIds[1], customerIds[8], talentIds[5]], medium: "In Person", date: "2026-04-11", notes: "Alfred connected Steven and Erik at a dinner, discussed infra needs" },
];

for (const intro of introductions) {
  insertIntroduction(intro.people, intro.medium, intro.date, intro.notes);
}

// ── Additional relationships (beyond those auto-created by introductions) ──

// Person-Person: Colleague, Co-founder, Mentor, Friends
const additionalPPRelationships = [
  [investorIds[2], investorIds[3], "Co-founder", "Co-founded a16z together"],
  [investorIds[6], investorIds[7], "Colleague", "Both at Y Combinator"],
  [investorIds[0], investorIds[1], "Colleague", "Both at Sequoia Capital"],
  [investorIds[4], investorIds[5], "Colleague", "Both at Accel Partners"],
  [customerIds[0], customerIds[6], "Friends", "Met at a fintech conference"],
  [customerIds[3], customerIds[4], "Friends", "Both in dev tools space"],
  [talentIds[0], talentIds[4], "Colleague", "Worked together at Google"],
  [talentIds[2], talentIds[8], "Friends", "Met at design conference"],
  [investorIds[9], talentIds[29], "Mentor", "Sarah mentoring Freya on leadership"],
  [investorIds[14], customerIds[11], "Mentor", "Lisa advising Samantha on fundraising"],
];

for (const [p1, p2, type, notes] of additionalPPRelationships) {
  insertPersonPersonRelationship(p1, p2, type, notes);
}

// Org-Person relationships
const orgPersonRelationships = [
  [orgs.sequoia, investorIds[0], "Investor", "Chairman emeritus"],
  [orgs.sequoia, investorIds[1], "Investor", "Partner"],
  [orgs.a16z, investorIds[2], "Founder", "Co-founder and general partner"],
  [orgs.a16z, investorIds[3], "Founder", "Co-founder and general partner"],
  [orgs.accel, investorIds[4], "Investor", "Partner"],
  [orgs.accel, investorIds[5], "Investor", "Partner"],
  [orgs.yc, investorIds[6], "Founder", "CEO"],
  [orgs.yc, investorIds[7], "Employee", "Managing director"],
  [orgs.techstars, investorIds[8], "Founder", "Co-founder"],
  [orgs.stripe, customerIds[0], "Employee", "VP Product"],
  [orgs.notion, customerIds[1], "Employee", "Head of Growth"],
  [orgs.figma, customerIds[2], "Employee", "Dir of Sales"],
  [orgs.linear, customerIds[3], "Founder", "CEO"],
  [orgs.vercel, customerIds[4], "Employee", "CTO"],
  [orgs.mercury, customerIds[5], "Employee", "Head of BD"],
  [orgs.ramp, customerIds[6], "Employee", "VP Sales"],
  [orgs.openai, customerIds[7], "Employee", "Dir of Partnerships"],
  [orgs.anthropic, customerIds[8], "Employee", "BD Lead"],
  [orgs.databricks, customerIds[9], "Employee", "VP Enterprise"],
  [orgs.openai, talentIds[4], "Employee", "Formerly at OpenAI research"],
];

for (const [orgId, personId, type, notes] of orgPersonRelationships) {
  insertOrgPersonRelationship(orgId, personId, type, notes);
}

// Org-Org relationships
const orgOrgRelationships = [
  [orgs.sequoia, orgs.stripe, "Investor", "Early investor in Stripe"],
  [orgs.a16z, orgs.figma, "Investor", "Led Series A"],
  [orgs.accel, orgs.notion, "Investor", "Growth round investor"],
  [orgs.yc, orgs.stripe, "Investor", "YC alumni"],
  [orgs.a16z, orgs.databricks, "Investor", "Series D lead"],
  [orgs.stripe, orgs.mercury, "Partner", "Payments integration"],
  [orgs.vercel, orgs.linear, "Partner", "Integration partnership"],
  [orgs.openai, orgs.anthropic, "Competitor", "Both in AI/LLM space"],
];

for (const [o1, o2, type, notes] of orgOrgRelationships) {
  insertOrgOrgRelationship(o1, o2, type, notes);
}

// ── Summary ──────────────────────────────────────────────

const counts = {
  people: db.prepare("SELECT COUNT(*) as c FROM people").get().c,
  organizations: db.prepare("SELECT COUNT(*) as c FROM organizations").get().c,
  introductions: db.prepare("SELECT COUNT(*) as c FROM interactions").get().c,
  pp_relationships: db.prepare("SELECT COUNT(*) as c FROM relationships_person_person").get().c,
  op_relationships: db.prepare("SELECT COUNT(*) as c FROM relationships_org_person").get().c,
  oo_relationships: db.prepare("SELECT COUNT(*) as c FROM relationships_org_org").get().c,
};

console.log("Seed complete:");
console.log(`  People:                  ${counts.people}`);
console.log(`  Organizations:           ${counts.organizations}`);
console.log(`  Introductions:           ${counts.introductions}`);
console.log(`  Person-Person rels:      ${counts.pp_relationships}`);
console.log(`  Org-Person rels:         ${counts.op_relationships}`);
console.log(`  Org-Org rels:            ${counts.oo_relationships}`);

db.close();
