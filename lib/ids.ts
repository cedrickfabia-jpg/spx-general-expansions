import { randomUUID } from "node:crypto";
import { queryOne } from "@/lib/db";

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function allocateRequestSequence(): number {
  const row = queryOne<{ value: number }>(
    "INSERT INTO sequence_counters (name, value) VALUES ('request_number', 1) ON CONFLICT(name) DO UPDATE SET value = value + 1 RETURNING value",
    []
  );
  return row?.value ?? 1;
}
