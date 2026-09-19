import { getDatabase, type AppDatabase } from "./database.js";

/**
 * The shared AppDatabase contract only exposes run() and first(). The real D1
 * binding passed in by cloudflare/worker.mjs is a full D1Database, so widen the
 * type here rather than editing the shared scaffolding.
 */
interface QueryableStatement {
  run(): Promise<unknown>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}

interface QueryableDatabase extends AppDatabase {
  prepare(sql: string): {
    bind(...values: (string | number | null)[]): QueryableStatement;
  } & QueryableStatement;
}

/**
 * D1 is only bound inside the Workers runtime. Plain Node paths (tests,
 * dev:server, register) have no database, so callers degrade instead of
 * failing the whole function call.
 */
function tryGetDatabase(): QueryableDatabase | null {
  try {
    return getDatabase() as QueryableDatabase;
  } catch {
    return null;
  }
}

/**
 * Scopes a record to one person in one channel. Built only from the
 * signature-verified context, never from client-supplied wamArgs.
 */
export function progressRecordId(
  channelId: string,
  callerType: string,
  callerId: string,
): string {
  return `checklist:v1:${channelId}:${callerType}:${callerId}`;
}

export async function readRecord(id: string): Promise<unknown | null> {
  const database = tryGetDatabase();
  if (!database) return null;
  const row = await database
    .prepare("SELECT value_json FROM app_records WHERE id = ?")
    .bind(id)
    .first<{ value_json: string }>();
  if (!row?.value_json) return null;
  try {
    return JSON.parse(row.value_json) as unknown;
  } catch {
    // A row written by an older shape should not break the whole screen.
    return null;
  }
}

/** Returns false when the value could not be stored, so callers can report it. */
export async function writeRecord(
  id: string,
  value: unknown,
): Promise<boolean> {
  const database = tryGetDatabase();
  if (!database) return false;
  const json = JSON.stringify(value);
  if (typeof json !== "string") return false;
  try {
    await database
      .prepare(
        `INSERT INTO app_records (id, value_json)
         VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE SET
           value_json = excluded.value_json,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(id, json)
      .run();
    return true;
  } catch {
    return false;
  }
}
