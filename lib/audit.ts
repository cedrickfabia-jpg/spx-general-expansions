import { newId } from "@/lib/ids";
import { queryRun } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface AuditInput {
  actorId: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function auditLog(input: AuditInput): void {
  queryRun(
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      newId("aud"),
      input.actorId,
      input.action,
      input.entityType ?? null,
      input.entityId ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      new Date().toISOString()
    ]
  );
  logger.debug(`audit: ${input.action}`, input.metadata ?? "");
}
