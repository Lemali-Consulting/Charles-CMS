import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "introductions.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");

    // Check if we need to migrate from old schema (contact_type) to new (contact_types)
    const tableInfo = db
      .prepare("PRAGMA table_info(introductions)")
      .all() as { name: string }[];
    const columns = tableInfo.map((c) => c.name);
    const hasOldSchema = columns.includes("contact_type");
    const hasNewSchema = columns.includes("contact_types");

    if (hasOldSchema && !hasNewSchema) {
      // Migrate: rebuild table with new schema
      db.exec(`
        CREATE TABLE introductions_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          founder_name TEXT NOT NULL,
          contact_name TEXT NOT NULL,
          contact_types TEXT NOT NULL,
          industry TEXT,
          company TEXT,
          university TEXT,
          website TEXT,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      db.exec(`
        INSERT INTO introductions_new (id, date, founder_name, contact_name, contact_types, notes, created_at)
        SELECT id, date, founder_name, contact_name, json_array(contact_type), notes, created_at
        FROM introductions
      `);
      db.exec("DROP TABLE introductions");
      db.exec("ALTER TABLE introductions_new RENAME TO introductions");
    } else if (!hasOldSchema && !hasNewSchema) {
      // Fresh database
      db.exec(`
        CREATE TABLE IF NOT EXISTS introductions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          founder_name TEXT NOT NULL,
          contact_name TEXT NOT NULL,
          contact_types TEXT NOT NULL,
          industry TEXT,
          company TEXT,
          university TEXT,
          website TEXT,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
    }
    // If hasNewSchema is already true, table is up to date — nothing to do

    // Migrate: add website column if missing
    const currentColumns = db
      .prepare("PRAGMA table_info(introductions)")
      .all() as { name: string }[];
    if (!currentColumns.some((c) => c.name === "website")) {
      db.exec("ALTER TABLE introductions ADD COLUMN website TEXT");
    }
  }
  return db;
}

export interface Introduction {
  id: number;
  date: string;
  founder_name: string;
  contact_name: string;
  contact_types: string[];
  industry: string | null;
  company: string | null;
  university: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
}

export interface IntroductionInput {
  date: string;
  founder_name: string;
  contact_name: string;
  contact_types: string[];
  industry?: string;
  company?: string;
  university?: string;
  website?: string;
  notes?: string;
}

export interface MonthlyStat {
  month: string;
  founder: number;
  investor: number;
  talent: number;
  customer: number;
  total: number;
}

export interface TagBreakdown {
  label: string;
  count: number;
  percentage: number;
}

const VALID_TYPES = ["founder", "investor", "talent", "customer"];

export function createIntroduction(input: IntroductionInput): Introduction {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO introductions (date, founder_name, contact_name, contact_types, industry, company, university, website, notes)
    VALUES (@date, @founder_name, @contact_name, @contact_types, @industry, @company, @university, @website, @notes)
  `);
  const result = stmt.run({
    date: input.date,
    founder_name: input.founder_name,
    contact_name: input.contact_name,
    contact_types: JSON.stringify(input.contact_types),
    industry: input.industry || null,
    company: input.company || null,
    university: input.university || null,
    website: input.website || null,
    notes: input.notes || null,
  });
  const row = db
    .prepare("SELECT * FROM introductions WHERE id = ?")
    .get(result.lastInsertRowid) as Record<string, unknown>;
  return deserializeIntroduction(row);
}

export function getIntroductions(): Introduction[] {
  const rows = getDb()
    .prepare("SELECT * FROM introductions ORDER BY date DESC")
    .all() as Record<string, unknown>[];
  return rows.map(deserializeIntroduction);
}

export function getMonthlyStats(): MonthlyStat[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
    SELECT
      strftime('%Y-%m', i.date) as month,
      SUM(CASE WHEN jt.value = 'founder' THEN 1 ELSE 0 END) as founder,
      SUM(CASE WHEN jt.value = 'investor' THEN 1 ELSE 0 END) as investor,
      SUM(CASE WHEN jt.value = 'talent' THEN 1 ELSE 0 END) as talent,
      SUM(CASE WHEN jt.value = 'customer' THEN 1 ELSE 0 END) as customer,
      COUNT(DISTINCT i.id) as total
    FROM introductions i, json_each(i.contact_types) jt
    GROUP BY strftime('%Y-%m', i.date)
    ORDER BY month ASC
  `
    )
    .all() as MonthlyStat[];
  return rows;
}

export function getCurrentMonthStats(): MonthlyStat | null {
  const db = getDb();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const row = db
    .prepare(
      `
    SELECT
      strftime('%Y-%m', i.date) as month,
      SUM(CASE WHEN jt.value = 'founder' THEN 1 ELSE 0 END) as founder,
      SUM(CASE WHEN jt.value = 'investor' THEN 1 ELSE 0 END) as investor,
      SUM(CASE WHEN jt.value = 'talent' THEN 1 ELSE 0 END) as talent,
      SUM(CASE WHEN jt.value = 'customer' THEN 1 ELSE 0 END) as customer,
      COUNT(DISTINCT i.id) as total
    FROM introductions i, json_each(i.contact_types) jt
    WHERE strftime('%Y-%m', i.date) = ?
  `
    )
    .get(currentMonth) as MonthlyStat | undefined;
  return row && row.total > 0 ? row : null;
}

export function getTagBreakdown(): {
  industries: TagBreakdown[];
  universities: TagBreakdown[];
} {
  const db = getDb();
  const total =
    (
      db
        .prepare("SELECT COUNT(*) as count FROM introductions")
        .get() as { count: number }
    ).count || 1;

  const industries = db
    .prepare(
      `
    SELECT industry as label, COUNT(*) as count
    FROM introductions
    WHERE industry IS NOT NULL AND industry != ''
    GROUP BY industry
    ORDER BY count DESC
  `
    )
    .all() as { label: string; count: number }[];

  const universities = db
    .prepare(
      `
    SELECT university as label, COUNT(*) as count
    FROM introductions
    WHERE university IS NOT NULL AND university != ''
    GROUP BY university
    ORDER BY count DESC
  `
    )
    .all() as { label: string; count: number }[];

  return {
    industries: industries.map((r) => ({
      ...r,
      percentage: Math.round((r.count / total) * 100),
    })),
    universities: universities.map((r) => ({
      ...r,
      percentage: Math.round((r.count / total) * 100),
    })),
  };
}

export function getDistinctTags(): {
  industries: string[];
  companies: string[];
  universities: string[];
} {
  const db = getDb();
  const industries = db
    .prepare(
      "SELECT DISTINCT industry FROM introductions WHERE industry IS NOT NULL AND industry != '' ORDER BY industry"
    )
    .all() as { industry: string }[];
  const companies = db
    .prepare(
      "SELECT DISTINCT company FROM introductions WHERE company IS NOT NULL AND company != '' ORDER BY company"
    )
    .all() as { company: string }[];
  const universities = db
    .prepare(
      "SELECT DISTINCT university FROM introductions WHERE university IS NOT NULL AND university != '' ORDER BY university"
    )
    .all() as { university: string }[];

  return {
    industries: industries.map((r) => r.industry),
    companies: companies.map((r) => r.company),
    universities: universities.map((r) => r.university),
  };
}

export function getFounderIntroductions(): Introduction[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM introductions
       WHERE EXISTS (
         SELECT 1 FROM json_each(contact_types) WHERE value = 'founder'
       )
       ORDER BY date DESC`
    )
    .all() as Record<string, unknown>[];
  return rows.map(deserializeIntroduction);
}

export function deleteIntroduction(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM introductions WHERE id = ?").run(id);
  return result.changes > 0;
}

function deserializeIntroduction(row: Record<string, unknown>): Introduction {
  return {
    ...(row as unknown as Omit<Introduction, "contact_types">),
    contact_types: JSON.parse(row.contact_types as string) as string[],
  };
}
