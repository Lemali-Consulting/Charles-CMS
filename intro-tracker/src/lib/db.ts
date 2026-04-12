import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.env.DB_DIR || process.cwd(), "crm.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
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

    CREATE TABLE IF NOT EXISTS person_tags (
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

    CREATE TABLE IF NOT EXISTS person_tag_links (
      person_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (person_id, tag_id),
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES person_tags(id) ON DELETE CASCADE
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

  // Seed default interaction types if empty
  const typeCount = db.prepare("SELECT COUNT(*) as c FROM interaction_types").get() as { c: number };
  if (typeCount.c === 0) {
    const insert = db.prepare("INSERT INTO interaction_types (name) VALUES (?)");
    for (const name of ["Introduction", "Meeting", "Email", "Call", "Coffee", "Event"]) {
      insert.run(name);
    }
  }

  // Seed default mediums if empty
  const mediumCount = db.prepare("SELECT COUNT(*) as c FROM interaction_mediums").get() as { c: number };
  if (mediumCount.c === 0) {
    const insert = db.prepare("INSERT INTO interaction_mediums (name) VALUES (?)");
    for (const name of ["In Person", "Email", "Phone", "Video Call", "LinkedIn", "Other"]) {
      insert.run(name);
    }
  }
}

// ── Types ──────────────────────────────────────────────

export interface Person {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  linkedin_url: string;
  notes: string;
  tags: { id: number; name: string }[];
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: number;
  name: string;
  org_type_id: number | null;
  org_type_name: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: number;
  interaction_type_id: number;
  interaction_type_name: string;
  medium_id: number | null;
  medium_name: string | null;
  date: string;
  notes: string;
  people: { id: number; first_name: string; last_name: string }[];
  organizations: { id: number; name: string }[];
  created_at: string;
  updated_at: string;
}

export interface RelationshipPersonPerson {
  id: number;
  person_1_id: number;
  person_1_name: string;
  person_2_id: number;
  person_2_name: string;
  relationship_type_id: number | null;
  relationship_type_name: string | null;
  notes: string;
  created_at: string;
}

export interface RelationshipOrgPerson {
  id: number;
  organization_id: number;
  organization_name: string;
  person_id: number;
  person_name: string;
  relationship_type_id: number | null;
  relationship_type_name: string | null;
  notes: string;
  created_at: string;
}

export interface RelationshipOrgOrg {
  id: number;
  org_1_id: number;
  org_1_name: string;
  org_2_id: number;
  org_2_name: string;
  relationship_type_id: number | null;
  relationship_type_name: string | null;
  notes: string;
  created_at: string;
}

export interface NamedEntity {
  id: number;
  name: string;
}

// ── People ─────────────────────────────────────────────

export function getPeople(search?: string): Person[] {
  const db = getDb();
  let rows: Record<string, unknown>[];
  if (search) {
    rows = db.prepare(`
      SELECT * FROM people
      WHERE first_name LIKE ? OR last_name LIKE ?
      ORDER BY last_name, first_name
    `).all(`%${search}%`, `%${search}%`) as Record<string, unknown>[];
  } else {
    rows = db.prepare("SELECT * FROM people ORDER BY last_name, first_name").all() as Record<string, unknown>[];
  }
  return rows.map(hydratePersonTags);
}

export function getPerson(id: number): Person | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM people WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return hydratePersonTags(row);
}

export function createPerson(data: { first_name: string; last_name: string; email?: string; linkedin_url?: string; notes?: string }): Person {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO people (first_name, last_name, email, linkedin_url, notes)
    VALUES (@first_name, @last_name, @email, @linkedin_url, @notes)
  `).run({
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email || "",
    linkedin_url: data.linkedin_url || "",
    notes: data.notes || "",
  });
  return getPerson(result.lastInsertRowid as number)!;
}

export function updatePerson(id: number, data: Partial<{ first_name: string; last_name: string; email: string; linkedin_url: string; notes: string }>): Person | null {
  const db = getDb();
  const fields: string[] = [];
  const values: Record<string, unknown> = { id };
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`${key} = @${key}`);
      values[key] = val;
    }
  }
  if (fields.length === 0) return getPerson(id);
  fields.push("updated_at = datetime('now')");
  db.prepare(`UPDATE people SET ${fields.join(", ")} WHERE id = @id`).run(values);
  return getPerson(id);
}

export function deletePerson(id: number): boolean {
  return getDb().prepare("DELETE FROM people WHERE id = ?").run(id).changes > 0;
}

function hydratePersonTags(row: Record<string, unknown>): Person {
  const db = getDb();
  const tags = db.prepare(`
    SELECT pt.id, pt.name FROM person_tags pt
    JOIN person_tag_links ptl ON ptl.tag_id = pt.id
    WHERE ptl.person_id = ?
  `).all(row.id as number) as { id: number; name: string }[];
  return { ...(row as unknown as Omit<Person, "tags">), tags };
}

export function setPersonTags(personId: number, tagNames: string[]): void {
  const db = getDb();
  db.prepare("DELETE FROM person_tag_links WHERE person_id = ?").run(personId);
  for (const name of tagNames) {
    db.prepare("INSERT OR IGNORE INTO person_tags (name) VALUES (?)").run(name);
    const tag = db.prepare("SELECT id FROM person_tags WHERE name = ?").get(name) as { id: number };
    db.prepare("INSERT INTO person_tag_links (person_id, tag_id) VALUES (?, ?)").run(personId, tag.id);
  }
}

export function getAllPersonTags(): NamedEntity[] {
  return getDb().prepare("SELECT id, name FROM person_tags ORDER BY name").all() as NamedEntity[];
}

// ── Organizations ──────────────────────────────────────

export function getOrganizations(search?: string): Organization[] {
  const db = getDb();
  const q = `
    SELECT o.*, ot.name as org_type_name
    FROM organizations o
    LEFT JOIN org_types ot ON o.org_type_id = ot.id
    ${search ? "WHERE o.name LIKE ?" : ""}
    ORDER BY o.name
  `;
  const rows = search
    ? db.prepare(q).all(`%${search}%`)
    : db.prepare(q).all();
  return rows as Organization[];
}

export function getOrganization(id: number): Organization | null {
  const row = getDb().prepare(`
    SELECT o.*, ot.name as org_type_name
    FROM organizations o
    LEFT JOIN org_types ot ON o.org_type_id = ot.id
    WHERE o.id = ?
  `).get(id) as Organization | undefined;
  return row || null;
}

export function createOrganization(data: { name: string; org_type_id?: number; notes?: string }): Organization {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO organizations (name, org_type_id, notes)
    VALUES (@name, @org_type_id, @notes)
  `).run({
    name: data.name,
    org_type_id: data.org_type_id || null,
    notes: data.notes || "",
  });
  return getOrganization(result.lastInsertRowid as number)!;
}

export function updateOrganization(id: number, data: Partial<{ name: string; org_type_id: number | null; notes: string }>): Organization | null {
  const db = getDb();
  const fields: string[] = [];
  const values: Record<string, unknown> = { id };
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`${key} = @${key}`);
      values[key] = val;
    }
  }
  if (fields.length === 0) return getOrganization(id);
  fields.push("updated_at = datetime('now')");
  db.prepare(`UPDATE organizations SET ${fields.join(", ")} WHERE id = @id`).run(values);
  return getOrganization(id);
}

export function deleteOrganization(id: number): boolean {
  return getDb().prepare("DELETE FROM organizations WHERE id = ?").run(id).changes > 0;
}

export function getOrgTypes(): NamedEntity[] {
  return getDb().prepare("SELECT id, name FROM org_types ORDER BY name").all() as NamedEntity[];
}

export function createOrgType(name: string): NamedEntity {
  const db = getDb();
  const result = db.prepare("INSERT INTO org_types (name) VALUES (?)").run(name);
  return { id: result.lastInsertRowid as number, name };
}

// ── Interactions ───────────────────────────────────────

export function getInteractions(filters?: { person_id?: number; org_id?: number; type_id?: number }): Interaction[] {
  const db = getDb();
  let where = "1=1";
  const params: unknown[] = [];
  if (filters?.person_id) {
    where += " AND i.id IN (SELECT interaction_id FROM interaction_people WHERE person_id = ?)";
    params.push(filters.person_id);
  }
  if (filters?.org_id) {
    where += " AND i.id IN (SELECT interaction_id FROM interaction_organizations WHERE organization_id = ?)";
    params.push(filters.org_id);
  }
  if (filters?.type_id) {
    where += " AND i.interaction_type_id = ?";
    params.push(filters.type_id);
  }
  const rows = db.prepare(`
    SELECT i.*, it.name as interaction_type_name, im.name as medium_name
    FROM interactions i
    JOIN interaction_types it ON i.interaction_type_id = it.id
    LEFT JOIN interaction_mediums im ON i.medium_id = im.id
    WHERE ${where}
    ORDER BY i.date DESC, i.id DESC
  `).all(...params) as Record<string, unknown>[];
  return rows.map(hydrateInteraction);
}

export function getInteraction(id: number): Interaction | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT i.*, it.name as interaction_type_name, im.name as medium_name
    FROM interactions i
    JOIN interaction_types it ON i.interaction_type_id = it.id
    LEFT JOIN interaction_mediums im ON i.medium_id = im.id
    WHERE i.id = ?
  `).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return hydrateInteraction(row);
}

export function createInteraction(data: {
  interaction_type_id: number;
  medium_id?: number;
  date: string;
  notes?: string;
  person_ids?: number[];
  organization_ids?: number[];
}): Interaction {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO interactions (interaction_type_id, medium_id, date, notes)
    VALUES (@interaction_type_id, @medium_id, @date, @notes)
  `).run({
    interaction_type_id: data.interaction_type_id,
    medium_id: data.medium_id || null,
    date: data.date,
    notes: data.notes || "",
  });
  const id = result.lastInsertRowid as number;
  if (data.person_ids?.length) {
    const stmt = db.prepare("INSERT INTO interaction_people (interaction_id, person_id) VALUES (?, ?)");
    for (const pid of data.person_ids) stmt.run(id, pid);
  }
  if (data.organization_ids?.length) {
    const stmt = db.prepare("INSERT INTO interaction_organizations (interaction_id, organization_id) VALUES (?, ?)");
    for (const oid of data.organization_ids) stmt.run(id, oid);
  }
  return getInteraction(id)!;
}

export function updateInteraction(id: number, data: Partial<{
  interaction_type_id: number;
  medium_id: number | null;
  date: string;
  notes: string;
  person_ids: number[];
  organization_ids: number[];
}>): Interaction | null {
  const db = getDb();
  const fields: string[] = [];
  const values: Record<string, unknown> = { id };
  for (const key of ["interaction_type_id", "medium_id", "date", "notes"] as const) {
    if (data[key] !== undefined) {
      fields.push(`${key} = @${key}`);
      values[key] = data[key];
    }
  }
  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    db.prepare(`UPDATE interactions SET ${fields.join(", ")} WHERE id = @id`).run(values);
  }
  if (data.person_ids !== undefined) {
    db.prepare("DELETE FROM interaction_people WHERE interaction_id = ?").run(id);
    const stmt = db.prepare("INSERT INTO interaction_people (interaction_id, person_id) VALUES (?, ?)");
    for (const pid of data.person_ids) stmt.run(id, pid);
  }
  if (data.organization_ids !== undefined) {
    db.prepare("DELETE FROM interaction_organizations WHERE interaction_id = ?").run(id);
    const stmt = db.prepare("INSERT INTO interaction_organizations (interaction_id, organization_id) VALUES (?, ?)");
    for (const oid of data.organization_ids) stmt.run(id, oid);
  }
  return getInteraction(id);
}

export function deleteInteraction(id: number): boolean {
  return getDb().prepare("DELETE FROM interactions WHERE id = ?").run(id).changes > 0;
}

function hydrateInteraction(row: Record<string, unknown>): Interaction {
  const db = getDb();
  const people = db.prepare(`
    SELECT p.id, p.first_name, p.last_name FROM people p
    JOIN interaction_people ip ON ip.person_id = p.id
    WHERE ip.interaction_id = ?
  `).all(row.id as number) as { id: number; first_name: string; last_name: string }[];
  const organizations = db.prepare(`
    SELECT o.id, o.name FROM organizations o
    JOIN interaction_organizations io ON io.organization_id = o.id
    WHERE io.interaction_id = ?
  `).all(row.id as number) as { id: number; name: string }[];
  return { ...(row as unknown as Omit<Interaction, "people" | "organizations">), people, organizations };
}

export function getInteractionTypes(): NamedEntity[] {
  return getDb().prepare("SELECT id, name FROM interaction_types ORDER BY name").all() as NamedEntity[];
}

export function createInteractionType(name: string): NamedEntity {
  const db = getDb();
  const result = db.prepare("INSERT INTO interaction_types (name) VALUES (?)").run(name);
  return { id: result.lastInsertRowid as number, name };
}

export function getInteractionMediums(): NamedEntity[] {
  return getDb().prepare("SELECT id, name FROM interaction_mediums ORDER BY name").all() as NamedEntity[];
}

export function createInteractionMedium(name: string): NamedEntity {
  const db = getDb();
  const result = db.prepare("INSERT INTO interaction_mediums (name) VALUES (?)").run(name);
  return { id: result.lastInsertRowid as number, name };
}

// ── Relationships ──────────────────────────────────────

// Person-Person
export function getPersonPersonRelationships(): RelationshipPersonPerson[] {
  return getDb().prepare(`
    SELECT r.*,
      p1.first_name || ' ' || p1.last_name as person_1_name,
      p2.first_name || ' ' || p2.last_name as person_2_name,
      rt.name as relationship_type_name
    FROM relationships_person_person r
    JOIN people p1 ON r.person_1_id = p1.id
    JOIN people p2 ON r.person_2_id = p2.id
    LEFT JOIN person_person_relationship_types rt ON r.relationship_type_id = rt.id
    ORDER BY r.created_at DESC
  `).all() as RelationshipPersonPerson[];
}

export function createPersonPersonRelationship(data: {
  person_1_id: number;
  person_2_id: number;
  relationship_type_id?: number;
  notes?: string;
}): RelationshipPersonPerson {
  const db = getDb();
  // Normalize ordering
  const [p1, p2] = data.person_1_id < data.person_2_id
    ? [data.person_1_id, data.person_2_id]
    : [data.person_2_id, data.person_1_id];
  const result = db.prepare(`
    INSERT INTO relationships_person_person (person_1_id, person_2_id, relationship_type_id, notes)
    VALUES (?, ?, ?, ?)
  `).run(p1, p2, data.relationship_type_id || null, data.notes || "");
  const row = db.prepare(`
    SELECT r.*,
      p1.first_name || ' ' || p1.last_name as person_1_name,
      p2.first_name || ' ' || p2.last_name as person_2_name,
      rt.name as relationship_type_name
    FROM relationships_person_person r
    JOIN people p1 ON r.person_1_id = p1.id
    JOIN people p2 ON r.person_2_id = p2.id
    LEFT JOIN person_person_relationship_types rt ON r.relationship_type_id = rt.id
    WHERE r.id = ?
  `).get(result.lastInsertRowid) as RelationshipPersonPerson;
  return row;
}

export function deletePersonPersonRelationship(id: number): boolean {
  return getDb().prepare("DELETE FROM relationships_person_person WHERE id = ?").run(id).changes > 0;
}

export function getPersonPersonRelationshipTypes(): NamedEntity[] {
  return getDb().prepare("SELECT id, name FROM person_person_relationship_types ORDER BY name").all() as NamedEntity[];
}

export function createPersonPersonRelationshipType(name: string): NamedEntity {
  const db = getDb();
  const result = db.prepare("INSERT INTO person_person_relationship_types (name) VALUES (?)").run(name);
  return { id: result.lastInsertRowid as number, name };
}

// Org-Person
export function getOrgPersonRelationships(): RelationshipOrgPerson[] {
  return getDb().prepare(`
    SELECT r.*,
      o.name as organization_name,
      p.first_name || ' ' || p.last_name as person_name,
      rt.name as relationship_type_name
    FROM relationships_org_person r
    JOIN organizations o ON r.organization_id = o.id
    JOIN people p ON r.person_id = p.id
    LEFT JOIN org_person_relationship_types rt ON r.relationship_type_id = rt.id
    ORDER BY r.created_at DESC
  `).all() as RelationshipOrgPerson[];
}

export function createOrgPersonRelationship(data: {
  organization_id: number;
  person_id: number;
  relationship_type_id?: number;
  notes?: string;
}): RelationshipOrgPerson {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO relationships_org_person (organization_id, person_id, relationship_type_id, notes)
    VALUES (?, ?, ?, ?)
  `).run(data.organization_id, data.person_id, data.relationship_type_id || null, data.notes || "");
  const row = db.prepare(`
    SELECT r.*,
      o.name as organization_name,
      p.first_name || ' ' || p.last_name as person_name,
      rt.name as relationship_type_name
    FROM relationships_org_person r
    JOIN organizations o ON r.organization_id = o.id
    JOIN people p ON r.person_id = p.id
    LEFT JOIN org_person_relationship_types rt ON r.relationship_type_id = rt.id
    WHERE r.id = ?
  `).get(result.lastInsertRowid) as RelationshipOrgPerson;
  return row;
}

export function deleteOrgPersonRelationship(id: number): boolean {
  return getDb().prepare("DELETE FROM relationships_org_person WHERE id = ?").run(id).changes > 0;
}

export function getOrgPersonRelationshipTypes(): NamedEntity[] {
  return getDb().prepare("SELECT id, name FROM org_person_relationship_types ORDER BY name").all() as NamedEntity[];
}

export function createOrgPersonRelationshipType(name: string): NamedEntity {
  const db = getDb();
  const result = db.prepare("INSERT INTO org_person_relationship_types (name) VALUES (?)").run(name);
  return { id: result.lastInsertRowid as number, name };
}

// Org-Org
export function getOrgOrgRelationships(): RelationshipOrgOrg[] {
  return getDb().prepare(`
    SELECT r.*,
      o1.name as org_1_name,
      o2.name as org_2_name,
      rt.name as relationship_type_name
    FROM relationships_org_org r
    JOIN organizations o1 ON r.org_1_id = o1.id
    JOIN organizations o2 ON r.org_2_id = o2.id
    LEFT JOIN org_org_relationship_types rt ON r.relationship_type_id = rt.id
    ORDER BY r.created_at DESC
  `).all() as RelationshipOrgOrg[];
}

export function createOrgOrgRelationship(data: {
  org_1_id: number;
  org_2_id: number;
  relationship_type_id?: number;
  notes?: string;
}): RelationshipOrgOrg {
  const db = getDb();
  const [o1, o2] = data.org_1_id < data.org_2_id
    ? [data.org_1_id, data.org_2_id]
    : [data.org_2_id, data.org_1_id];
  const result = db.prepare(`
    INSERT INTO relationships_org_org (org_1_id, org_2_id, relationship_type_id, notes)
    VALUES (?, ?, ?, ?)
  `).run(o1, o2, data.relationship_type_id || null, data.notes || "");
  const row = db.prepare(`
    SELECT r.*,
      o1.name as org_1_name,
      o2.name as org_2_name,
      rt.name as relationship_type_name
    FROM relationships_org_org r
    JOIN organizations o1 ON r.org_1_id = o1.id
    JOIN organizations o2 ON r.org_2_id = o2.id
    LEFT JOIN org_org_relationship_types rt ON r.relationship_type_id = rt.id
    WHERE r.id = ?
  `).get(result.lastInsertRowid) as RelationshipOrgOrg;
  return row;
}

export function deleteOrgOrgRelationship(id: number): boolean {
  return getDb().prepare("DELETE FROM relationships_org_org WHERE id = ?").run(id).changes > 0;
}

export function getOrgOrgRelationshipTypes(): NamedEntity[] {
  return getDb().prepare("SELECT id, name FROM org_org_relationship_types ORDER BY name").all() as NamedEntity[];
}

export function createOrgOrgRelationshipType(name: string): NamedEntity {
  const db = getDb();
  const result = db.prepare("INSERT INTO org_org_relationship_types (name) VALUES (?)").run(name);
  return { id: result.lastInsertRowid as number, name };
}

// ── Stats (for Dashboard/Trends) ──────────────────────

export interface MonthlyStat {
  month: string;
  total: number;
  by_type: Record<string, number>;
}

export function getMonthlyInteractionStats(): MonthlyStat[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', i.date) as month,
      it.name as type_name,
      COUNT(*) as count
    FROM interactions i
    JOIN interaction_types it ON i.interaction_type_id = it.id
    GROUP BY month, type_name
    ORDER BY month ASC
  `).all() as { month: string; type_name: string; count: number }[];

  const monthMap = new Map<string, MonthlyStat>();
  for (const row of rows) {
    if (!monthMap.has(row.month)) {
      monthMap.set(row.month, { month: row.month, total: 0, by_type: {} });
    }
    const stat = monthMap.get(row.month)!;
    stat.by_type[row.type_name] = row.count;
    stat.total += row.count;
  }
  return Array.from(monthMap.values());
}

export function getCurrentMonthInteractionStats(): { total: number; by_type: Record<string, number> } {
  const db = getDb();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const rows = db.prepare(`
    SELECT it.name as type_name, COUNT(*) as count
    FROM interactions i
    JOIN interaction_types it ON i.interaction_type_id = it.id
    WHERE strftime('%Y-%m', i.date) = ?
    GROUP BY type_name
  `).all(currentMonth) as { type_name: string; count: number }[];

  const result: { total: number; by_type: Record<string, number> } = { total: 0, by_type: {} };
  for (const row of rows) {
    result.by_type[row.type_name] = row.count;
    result.total += row.count;
  }
  return result;
}

// ── Relationships for a specific person ────────────────

export function getRelationshipsForPerson(personId: number): {
  people: RelationshipPersonPerson[];
  organizations: RelationshipOrgPerson[];
} {
  const db = getDb();
  const people = db.prepare(`
    SELECT r.*,
      p1.first_name || ' ' || p1.last_name as person_1_name,
      p2.first_name || ' ' || p2.last_name as person_2_name,
      rt.name as relationship_type_name
    FROM relationships_person_person r
    JOIN people p1 ON r.person_1_id = p1.id
    JOIN people p2 ON r.person_2_id = p2.id
    LEFT JOIN person_person_relationship_types rt ON r.relationship_type_id = rt.id
    WHERE r.person_1_id = ? OR r.person_2_id = ?
    ORDER BY r.created_at DESC
  `).all(personId, personId) as RelationshipPersonPerson[];

  const organizations = db.prepare(`
    SELECT r.*,
      o.name as organization_name,
      p.first_name || ' ' || p.last_name as person_name,
      rt.name as relationship_type_name
    FROM relationships_org_person r
    JOIN organizations o ON r.organization_id = o.id
    JOIN people p ON r.person_id = p.id
    LEFT JOIN org_person_relationship_types rt ON r.relationship_type_id = rt.id
    WHERE r.person_id = ?
    ORDER BY r.created_at DESC
  `).all(personId) as RelationshipOrgPerson[];

  return { people, organizations };
}

export function getInteractionsForPerson(personId: number): Interaction[] {
  return getInteractions({ person_id: personId });
}
