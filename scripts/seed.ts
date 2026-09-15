import { initializeDatabase, nowUtc, queryOne, queryRun } from "@/lib/db";
import { ensureRoles, setUserRoles, upsertUserForDevLogin } from "@/lib/auth";
import {
  createHub,
  getHub,
  upsertWorkflowAccess,
  upsertWorkflowApprover,
  upsertApproverRoute
} from "@/features/hod-approvals/repository";
import { HOD_APPROVAL_WORKFLOW_ID } from "@/lib/workflows";
import {
  approveStep,
  askQuestion,
  cancelDraft,
  createDraft,
  rejectStep,
  respondToQuestion,
  submitRequest,
  updateDraft,
  uploadDocumentVersion,
  withdrawRequest
} from "@/features/hod-approvals/workflow";
import { emptyForm, REQUIRED_DOCUMENT_TYPES } from "@/features/hod-approvals/forms/fields";
import { getStorageProvider } from "@/lib/storage";
import { logger } from "@/lib/logger";

export async function seedDatabase(): Promise<void> {
initializeDatabase();
ensureRoles();

const users: Record<string, string> = {};
async function makeUser(email: string, roles: Array<"REQUESTER" | "HOD_APPROVER" | "WATCHER" | "ADMINISTRATOR">): Promise<string> {
  const user = upsertUserForDevLogin({ email });
  setUserRoles(user.id, roles);
  users[email] = user.id;
  return user.id;
}

const requesterId = await makeUser("requester.demo@spxexpress.com", ["REQUESTER"]);
const hod1Id = await makeUser("hod1.demo@spxexpress.com", ["HOD_APPROVER"]);
const hod2Id = await makeUser("hod2.demo@spxexpress.com", ["HOD_APPROVER"]);
const watcherId = await makeUser("watcher.demo@spxexpress.com", ["WATCHER", "REQUESTER"]);
const adminId = await makeUser("admin.demo@spxexpress.com", ["ADMINISTRATOR", "HOD_APPROVER"]);
const cedrickId = await makeUser("cedrick.fabia@spxexpress.com", ["ADMINISTRATOR", "HOD_APPROVER"]);

function findOrCreateHub(name: string, code: string) {
  const existing = queryOne<{ id: string }>(`SELECT id FROM hubs WHERE code = ?`, [code]);
  return existing ? getHub(existing.id)! : createHub({ name, code });
}

const hubManila = findOrCreateHub("Manila Hub", "MNL");
const hubCebu = findOrCreateHub("Cebu Hub", "CEB");

upsertApproverRoute({ hubId: hubManila.id, slot: 1, approverUserId: hod1Id });
upsertApproverRoute({ hubId: hubManila.id, slot: 2, approverUserId: hod2Id });
upsertApproverRoute({ hubId: hubCebu.id, slot: 1, approverUserId: hod1Id });
upsertApproverRoute({ hubId: hubCebu.id, slot: 2, approverUserId: hod2Id });
upsertWorkflowApprover(HOD_APPROVAL_WORKFLOW_ID, 1, hod1Id);
upsertWorkflowApprover(HOD_APPROVAL_WORKFLOW_ID, 2, hod2Id);
upsertWorkflowAccess(HOD_APPROVAL_WORKFLOW_ID, requesterId, "REQUESTER");
upsertWorkflowAccess(HOD_APPROVAL_WORKFLOW_ID, watcherId, "REQUESTER");
upsertWorkflowAccess(HOD_APPROVAL_WORKFLOW_ID, hod1Id, "HOD_1");
upsertWorkflowAccess(HOD_APPROVAL_WORKFLOW_ID, hod2Id, "HOD_2");
upsertWorkflowAccess(HOD_APPROVAL_WORKFLOW_ID, adminId, "ADMINISTRATOR");
upsertWorkflowAccess(HOD_APPROVAL_WORKFLOW_ID, cedrickId, "ADMINISTRATOR");

function baseForm(overrides: Record<string, unknown> = {}) {
  return {
    ...emptyForm(),
    title: "Demo HOD Approval",
    requestType: "Expansion",
    businessJustification: "This is a clearly fictional demo request used to demonstrate the HOD approval workflow end to end.",
    expectedOutcome: "Demonstrated workflow",
    operationalImpact: "No real impact",
    requiredDate: "2026-09-20",
    targetCompletionDate: "2026-10-15",
    estimatedAmount: "250000",
    currency: "PHP",
    costCenter: "OPS-001",
    hubId: hubManila.id,
    location: "Manila",
    facility: "Main site",
    hubName: "Manila Hub",
    region: "NCR",
    pipeline: "Yes",
    facilityType: "Hub",
    expansionType: "Split",
    siteName: "Butuan Libertad Hub",
    state: "MIN",
    city: "Agusan Del Norte",
    district: "Butuan City",
    completeAddress: "P3, Libertad, Butuan City",
    coordinates: "8.9466658,125.5033411",
    expansionsPIC: "Mic Abroguena",
    areaManager: "Mylene Quise",
    leaseType: "Sublease",
    subleaseMarkupPercent: "20%",
    reasonForSubleasing: "Only viable option to secure the site; procurement endorsed the lowest bidder.",
    facilityWork: "Facility Ready for Fit-Out",
    locationScore: "86.17 / 100",
    dueDiligenceStatus: "Completed",
    rentBenchmark: "Benchmark: PHP 350/sqm; Actual: PHP 144/sqm; %Diff: 58.86% (Below Benchmark)",
    rentEscalation: "5.00% escalation yearly",
    cpoBenchmark: "Benchmark: $0.031; Actual: $0.019; % Diff: 39.41% (Below Budget)",
    securityDeposit: "3 months of rent; PHP 382,327.95; Note: No SecDep if under Subleasing",
    renovation: "Required-SPX to shoulder",
    renovationType: "Major Works (Standard SPX Renov+Parking/Structural/Power Upgrade)",
    otherConcerns: "N/A",
    adoTotal: "3,042.02",
    lastMile: "3,038.70",
    firstMile: "9.95",
    totalLeasedAreaSize: "400 sqm",
    indoorSize: "300 sqm",
    outdoorSize: "100 sqm",
    utilization: "1. Existing hub (Incase of Split) - Pre split: 92.73% - Post-split: 52.65%; 2. Proposed Site: 25.61%",
    monthlyRentVatExclusive: "PHP 140,000.00",
    renovationEstimate: "PHP 560,235.00",
    renovationDepreciation: "PHP 23,343.13",
    totalMonthlyCost: "PHP 163,343.13",
    cpoRentRenovation: "$0.029",
    cpoRent: "$0.025",
    cpoRenov: "$0.004",
    lessorSublessor: "Genuine CDO Realty",
    contractTermMonths: "24 months",
    yearlyEscalationRate: "5%",
    advanceRentPhp: "6 months",
    securityDepositPhp: "0 months",
    utilityDepositPhp: "0 months",
    cpoBudgetStatus: "WITHIN_CPO_BUDGET",
    watcherEmails: ["watcher.demo@spxexpress.com"],
    notes: "Seed scenario",
    ...overrides
  };
}

async function attachRequiredDocs(requesterId: string, draftId: string) {
  const storage = {
    async put(key: string, data: Buffer) { await getStorageProvider().put(key, data, "application/pdf"); },
    async delete(key: string) { await getStorageProvider().delete(key); }
  };
  for (const type of REQUIRED_DOCUMENT_TYPES) {
    await uploadDocumentVersion(requesterId, draftId, {
      documentName: type,
      originalFilename: `${type.replace(/\s+/g, "-").toLowerCase()}-demo.pdf`,
      mimeType: "application/pdf",
      size: 1024,
      data: Buffer.from(`%PDF-1.4 ${type} demo`)
    }, storage);
  }
}

async function submitWithDocuments(requesterId: string, draftId: string) {
  await attachRequiredDocs(requesterId, draftId);
  return submitRequest(requesterId, draftId);
}

const draftId = createDraft(requesterId, baseForm({ title: "Draft expansion request" })).id;
void draftId;

const pendingWithin = await submitWithDocuments(requesterId, createDraft(requesterId, baseForm({ title: "Pending within budget" })).id);
const approvedWithinId = createDraft(requesterId, baseForm({ title: "Approved within budget" })).id;
updateDraft(requesterId, approvedWithinId, baseForm({ title: "Approved within budget", estimatedAmount: "50000" }));
const approvedWithin = await submitWithDocuments(requesterId, approvedWithinId);
const approvedWithinStep = (await import("@/features/hod-approvals/repository")).listStepsForRequest(approvedWithin.id)[0];
approveStep(approvedWithinStep.approverId, approvedWithinStep.id);

const above = await submitWithDocuments(requesterId, createDraft(requesterId, baseForm({ title: "Above budget expansion", cpoBudgetStatus: "ABOVE_CPO_BUDGET", estimatedAmount: "5000000" })).id);
const aboveSteps = (await import("@/features/hod-approvals/repository")).listStepsForRequest(above.id);
approveStep(aboveSteps[0].approverId, aboveSteps[0].id);
const aboveSteps2 = (await import("@/features/hod-approvals/repository")).listStepsForRequest(above.id);
approveStep(aboveSteps2[1].approverId, aboveSteps2[1].id);

const question = await submitWithDocuments(requesterId, createDraft(requesterId, baseForm({ title: "Request with question", estimatedAmount: "1200000", cpoBudgetStatus: "ABOVE_CPO_BUDGET" })).id);
const questionSteps = (await import("@/features/hod-approvals/repository")).listStepsForRequest(question.id);
askQuestion(questionSteps[0].approverId, questionSteps[0].id, "Please provide the latest site capacity report.");
respondToQuestion(requesterId, question.id, "Attached the latest capacity report.", {
  data: { businessJustification: "This is a clearly fictional demo request used to demonstrate the HOD approval workflow end to end with an updated justification." },
  reason: "Updated justification after question"
});
const fakeStorage = {
  async put(key: string, data: Buffer) { await getStorageProvider().put(key, data, "application/pdf"); },
  async delete(key: string) { await getStorageProvider().delete(key); }
};
await uploadDocumentVersion(requesterId, question.id, {
  documentName: "FF Approval",
  originalFilename: "ff-approval-v2.pdf",
  mimeType: "application/pdf",
  size: 1024,
  data: Buffer.from("%PDF-1.4 demo document")
}, fakeStorage);
const questionStepsAfter = (await import("@/features/hod-approvals/repository")).listStepsForRequest(question.id);
approveStep(questionStepsAfter[0].approverId, questionStepsAfter[0].id);
const questionStepsAfter2 = (await import("@/features/hod-approvals/repository")).listStepsForRequest(question.id);
approveStep(questionStepsAfter2[1].approverId, questionStepsAfter2[1].id);

const rejected = await submitWithDocuments(requesterId, createDraft(requesterId, baseForm({ title: "Rejected request" })).id);
const rejectedStep = (await import("@/features/hod-approvals/repository")).listStepsForRequest(rejected.id)[0];
rejectStep(rejectedStep.approverId, rejectedStep.id, "The submitted figures need to be revised before this can proceed.");

const cancelled = await submitWithDocuments(requesterId, createDraft(requesterId, baseForm({ title: "Cancelled request" })).id);
withdrawRequest(requesterId, cancelled.id, "No longer needed for this quarter.");

queryRun(`INSERT OR IGNORE INTO approval_watchers (approval_request_id, user_id, added_by, created_at) VALUES (?, ?, ?, ?)`, [pendingWithin.id, watcherId, requesterId, nowUtc()]);

void cancelDraft;
logger.info("seed data created");
console.log("Seed complete. Demo accounts:");
console.log("  requester.demo@spxexpress.com");
console.log("  hod1.demo@spxexpress.com");
console.log("  hod2.demo@spxexpress.com");
console.log("  watcher.demo@spxexpress.com");
console.log("  admin.demo@spxexpress.com");
}
