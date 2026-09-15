import { initializeDatabase, closeDb } from "@/lib/db";
import { ensureRoles, setUserRoles, upsertUserForDevLogin } from "@/lib/auth";
import { createHub, upsertApproverRoute } from "@/features/hod-approvals/repository";
import { emptyForm, REQUIRED_DOCUMENT_TYPES } from "@/features/hod-approvals/forms/fields";
import { uploadDocumentVersion } from "@/features/hod-approvals/workflow";
import type { HODApprovalFormData } from "@/features/hod-approvals/types";

export function resetDatabase(): void {
  closeDb();
  initializeDatabase(":memory:");
  ensureRoles();
}

export function createTestUser(email: string, roles: Array<"REQUESTER" | "HOD_APPROVER" | "WATCHER" | "ADMINISTRATOR">): string {
  const user = upsertUserForDevLogin({ email });
  setUserRoles(user.id, roles);
  return user.id;
}

export function createTestHub(name: string, code: string): { id: string; name: string; code: string } {
  const hub = createHub({ name, code });
  return { id: hub.id, name: hub.name, code: hub.code };
}

export function configureRoute(hubId: string, slot: 1 | 2, userId: string): void {
  upsertApproverRoute({ hubId, slot, approverUserId: userId });
}

export function baseForm(hubId: string, overrides: Partial<HODApprovalFormData> = {}): HODApprovalFormData {
  return {
    ...emptyForm(),
    title: "Test expansion request",
    requestType: "Expansion",
    businessJustification: "This is a test business justification that is long enough to pass validation.",
    expectedOutcome: "Improved operations",
    operationalImpact: "Minimal",
    requiredDate: "2026-10-01",
    targetCompletionDate: "2026-11-01",
    estimatedAmount: "100000",
    currency: "PHP",
    costCenter: "TEST-01",
    hubId,
    location: "Test site",
    facility: "Facility A",
    hubName: "Test Hub",
    region: "NCR",
    pipeline: "Yes",
    facilityType: "Hub",
    expansionType: "Split",
    utilization: "1. Existing hub - Pre split: 92.73% - Post-split: 52.65%; 2. Proposed Site: 25.61%",
    leaseType: "Direct Lease",
    subleaseMarkupPercent: "0%",
    reasonForSubleasing: "N/A",
    facilityWork: "Facility Ready for Fit-Out",
    locationScore: "86 / 100",
    dueDiligenceStatus: "Completed",
    rentBenchmark: "Benchmark PHP 350/sqm",
    rentEscalation: "5% escalation yearly",
    cpoBenchmark: "Benchmark $0.031; Actual $0.019",
    securityDeposit: "3 months of rent; PHP 382,327.95",
    renovation: "Not Required",
    renovationType: "Minor Works (Additional Lighting and Power, Standard safety requirements)",
    cpoBudgetStatus: "WITHIN_CPO_BUDGET",
    watcherEmails: ["watcher.test@spxexpress.com"],
    notes: "Automated test",
    ...overrides
  };
}

export function fakeStorage() {
  const files = new Map<string, Buffer>();
  return {
    files,
    async put(key: string, data: Buffer) {
      files.set(key, data);
    },
    async get(key: string) {
      return files.get(key) ?? null;
    },
    async delete(key: string) {
      files.delete(key);
    }
  };
}

export async function attachRequiredDocuments(requesterId: string, requestId: string): Promise<void> {
  const storage = fakeStorage();
  for (const type of REQUIRED_DOCUMENT_TYPES) {
    await uploadDocumentVersion(requesterId, requestId, {
      documentName: type,
      originalFilename: `${type.replace(/\s+/g, "-").toLowerCase()}.pdf`,
      mimeType: "application/pdf",
      size: 1024,
      data: Buffer.from(`%PDF-1.4 ${type}`)
    }, storage);
  }
}
