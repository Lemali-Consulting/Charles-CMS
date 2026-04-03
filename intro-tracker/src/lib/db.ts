import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "introductions.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS introductions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        founder_name TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        contact_type TEXT NOT NULL CHECK(contact_type IN ('investor', 'talent', 'customer')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}

export interface Introduction {
  id: number;
  date: string;
  founder_name: string;
  contact_name: string;
  contact_type: "investor" | "talent" | "customer";
  notes: string | null;
  created_at: string;
}

export interface IntroductionInput {
  date: string;
  founder_name: string;
  contact_name: string;
  contact_type: "investor" | "talent" | "customer";
  notes?: string;
}

export interface MonthlyStat {
  month: string;
  investor: number;
  talent: number;
  customer: number;
  total: number;
}

export function createIntroduction(input: IntroductionInput): Introduction {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO introductions (date, founder_name, contact_name, contact_type, notes)
    VALUES (@date, @founder_name, @contact_name, @contact_type, @notes)
  `);
  const result = stmt.run({
    date: input.date,
    founder_name: input.founder_name,
    contact_name: input.contact_name,
    contact_type: input.contact_type,
    notes: input.notes || null,
  });
  return getDb()
    .prepare("SELECT * FROM introductions WHERE id = ?")
    .get(result.lastInsertRowid) as Introduction;
}

export function getIntroductions(): Introduction[] {
  return getDb()
    .prepare("SELECT * FROM introductions ORDER BY date DESC")
    .all() as Introduction[];
}

export function getMonthlyStats(): MonthlyStat[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN contact_type = 'investor' THEN 1 ELSE 0 END) as investor,
      SUM(CASE WHEN contact_type = 'talent' THEN 1 ELSE 0 END) as talent,
      SUM(CASE WHEN contact_type = 'customer' THEN 1 ELSE 0 END) as customer,
      COUNT(*) as total
    FROM introductions
    GROUP BY strftime('%Y-%m', date)
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
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN contact_type = 'investor' THEN 1 ELSE 0 END) as investor,
      SUM(CASE WHEN contact_type = 'talent' THEN 1 ELSE 0 END) as talent,
      SUM(CASE WHEN contact_type = 'customer' THEN 1 ELSE 0 END) as customer,
      COUNT(*) as total
    FROM introductions
    WHERE strftime('%Y-%m', date) = ?
  `
    )
    .get(currentMonth) as MonthlyStat | undefined;
  return row && row.total > 0 ? row : null;
}

export function deleteIntroduction(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM introductions WHERE id = ?").run(id);
  return result.changes > 0;
}
