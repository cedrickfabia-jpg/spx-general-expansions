import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-session";
import { updateHub } from "@/features/hod-approvals/repository";
import { auditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body?.name || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Name and active are required" }, { status: 400 });
  }
  try {
    const hub = updateHub(id, { name: body.name, active: body.active });
    auditLog({ actorId: admin.id, action: "HUB_UPDATED", entityType: "hubs", entityId: id, metadata: { name: hub.name, active: hub.active } });
    return NextResponse.json(hub);
  } catch (error) {
    logger.error("update hub failed", error);
    return NextResponse.json({ error: "Could not update hub" }, { status: 400 });
  }
}
