import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { SCHEMA } from "@/lib/schema";
import { logger } from "@/lib/logger";

let db: DatabaseSync | null = null;
let dbUri = "";

export function resolveDbPath(uri?: string): string {
  const raw = uri ?? process.env.DATABASE_URL ?? "file:./data/app.db";
  if (raw === ":memory:") return ":memory:";
  const match = raw.match(/^file:(.+)$/);
  const rel = match ? match[1] : raw;
  if (path.isAbsolute(rel)) return rel;
  return path.join(process.cwd(), rel);
}

function ensureMigrations(instance: DatabaseSync): void {
  const routeColumns = instance.prepare(`PRAGMA table_info(approver_routes)`).all() as Array<{ name: string }>;
  if (!routeColumns.some((column) => column.name === "workflow_id")) {
    instance.exec(`ALTER TABLE approver_routes ADD COLUMN workflow_id TEXT NOT NULL DEFAULT 'hod-approval';`);
  }
  instance.exec(`DROP TABLE IF EXISTS cpo_budgets;`);
  instance.exec(`DROP TABLE IF EXISTS approver_replacements;`);
}

export function initializeDatabase(uri?: string): DatabaseSync {
  const target = resolveDbPath(uri);
  if (db && dbUri === target) return db;
  if (db) {
    try {
      db.close();
    } catch {
      // already closed
    }
    db = null;
  }
  if (target !== ":memory:") {
    fs.mkdirSync(path.dirname(target), { recursive: true });
  }
  const instance = new DatabaseSync(target);
  instance.exec("PRAGMA foreign_keys = ON;");
  instance.exec("PRAGMA journal_mode = WAL;");
  instance.exec(SCHEMA);
  ensureMigrations(instance);
  db = instance;
  dbUri = target;
  return instance;
}

export function getDb(): DatabaseSync {
  if (!db) return initializeDatabase();
  return db;
}

export function closeDb(): void {
  if (db) {
    try {
      db.close();
    } catch {
      // ignore
    }
    db = null;
    dbUri = "";
  }
}

export function nowUtc(): string {
  return new Date().toISOString();
}

export function transaction<T>(fn: () => T): T {
  const instance = getDb();
  instance.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    instance.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      instance.exec("ROLLBACK");
    } catch {
      // rollback may already be complete
    }
    throw error;
  }
}

export type SqlValue = string | number | bigint | null | Uint8Array;

export function queryAll<T = Record<string, unknown>>(sql: string, params: SqlValue[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

export function queryOne<T = Record<string, unknown>>(sql: string, params: SqlValue[] = []): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function queryRun(sql: string, params: SqlValue[] = []): { changes: number; lastInsertRowid: number | bigint } {
  try {
    const result = getDb().prepare(sql).run(...params);
    return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
  } catch (error) {
    logger.error("query failed", { sql, params });
    throw error;
  }
}
