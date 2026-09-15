import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-session";
import { createHub, listHubs, updateHub } from "@/features/hod-approvals/repository";
import { auditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET() {
  const admin = await requireAdmin();
  void admin;
  return NextResponse.json(listHubs(true));
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  try {
    const hub = createHub({ name: body.name });
    auditLog({ actorId: admin.id, action: "HUB_CREATED", entityType: "hubs", entityId: hub.id, metadata: { name: hub.name } });
    return NextResponse.json(hub, { status: 201 });
  } catch (error) {
    logger.error("create hub failed", error);
    return NextResponse.json({ error: "Could not create hub" }, { status: 400 });
  }
}
