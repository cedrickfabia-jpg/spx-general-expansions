import { beforeEach, describe, expect, it } from "vitest";
import { closeDb, queryOne } from "@/lib/db";
import { getUserByEmail } from "@/lib/auth";
import {
  addComment,
  approveStep,
  askQuestion,
  createDraft,
  rejectStep,
  removeSelfFromWatchers,
  respondToQuestion,
  submitRequest,
  updateDraft,
  uploadDocumentVersion,
  withdrawRequest,
  WorkflowError
} from "@/features/hod-approvals/workflow";
import {
  listDocumentsForRequest,
  listCommentsForRequest,
  listRevisionsForRequest,
  listStepsForRequest,
  listMyWatchedRequests
} from "@/features/hod-approvals/repository";
import {
  attachRequiredDocuments,
  baseForm,
  configureRoute,
  createTestHub,
  createTestUser,
  fakeStorage,
  resetDatabase
} from "./helpers";

async function submitWithDocuments(requesterId: string, draftId: string) {
  await attachRequiredDocuments(requesterId, draftId);
  return submitRequest(requesterId, draftId);
}

describe("HOD Approval Workflow", () => {
  beforeEach(() => resetDatabase());

  it("routes within-budget requests to one approver", async () => {
    const requester = createTestUser("requester@spxexpress.com", ["REQUESTER"]);
    const hod1 = createTestUser("hod1@spxexpress.com", ["HOD_APPROVER"]);
    const hub = createTestHub("Metro Hub", "MNL");
    configureRoute(hub.id, 1, hod1);

    const draft = createDraft(requester, baseForm(hub.id, { cpoBudgetStatus: "WITHIN_CPO_BUDGET" }));
    const request = await submitWithDocuments(requester, draft.id);
    const steps = listStepsForRequest(request.id);

    expect(request.requiredApproverCount).toBe(1);
    expect(steps).toHaveLength(1);
    expect(steps[0].status).toBe("ACTIVE");
    expect(steps[0].approverId).toBe(hod1);

    const final = approveStep(hod1, steps[0].id);
    expect(final.status).toBe("APPROVED");
  });

  it("routes above-budget requests to two sequential approvers", async () => {
    const requester = createTestUser("requester@spxexpress.com", ["REQUESTER"]);
    const hod1 = createTestUser("hod1@spxexpress.com", ["HOD_APPROVER"]);
    const hod2 = createTestUser("hod2@spxexpress.com", ["HOD_APPROVER"]);
    const hub = createTestHub("Cebu Hub", "CEB");
    configureRoute(hub.id, 1, hod1);
    configureRoute(hub.id, 2, hod2);

    const draft = createDraft(requester, baseForm(hub.id, { cpoBudgetStatus: "ABOVE_CPO_BUDGET" }));
    const request = await submitWithDocuments(requester, draft.id);
    const steps = listStepsForRequest(request.id);

    expect(steps).toHaveLength(2);
    expect(steps[0].status).toBe("ACTIVE");
    expect(steps[1].status).toBe("PENDING");

    expect(() => approveStep(hod2, steps[1].id)).toThrow(WorkflowError);
    const afterFirst = approveStep(hod1, steps[0].id);
    const stepsAfter = listStepsForRequest(request.id);
    expect(stepsAfter[1].status).toBe("ACTIVE");

    const final = approveStep(hod2, stepsAfter[1].id);
    expect(afterFirst.status).toBe("PENDING_APPROVAL");
    expect(final.status).toBe("APPROVED");
  });

  it("keeps HOD 2 inactive while HOD 1 has an open question", async () => {
    const requester = createTestUser("requester@spxexpress.com", ["REQUESTER"]);
    const hod1 = createTestUser("hod1@spxexpress.com", ["HOD_APPROVER"]);
    const hod2 = createTestUser("hod2@spxexpress.com", ["HOD_APPROVER"]);
    const hub = createTestHub("Luzon Hub", "LUZ");
    configureRoute(hub.id, 1, hod1);
    configureRoute(hub.id, 2, hod2);

    const draft = createDraft(requester, baseForm(hub.id, { cpoBudgetStatus: "ABOVE_CPO_BUDGET" }));
    const request = await submitWithDocuments(requester, draft.id);
    const steps = listStepsForRequest(request.id);
    askQuestion(hod1, steps[0].id, "Please provide more detail.");

    expect(queryOne<{ status: string }>(`SELECT status FROM approval_requests WHERE id = ?`, [request.id])?.status).toBe("QUESTION_RAISED");
    expect(listStepsForRequest(request.id)[1].status).toBe("PENDING");
    expect(() => approveStep(hod2, steps[1].id)).toThrow(WorkflowError);

    respondToQuestion(requester, request.id, "Here is the additional detail.", {
      data: { businessJustification: "Updated justification after the question was raised for this test request." },
      reason: "Answering the question"
    });
    const revisions = listRevisionsForRequest(request.id);
    expect(revisions).toHaveLength(2);
    expect(revisions[0].dataJson).not.toBe(revisions[1].dataJson);

    const updatedSteps = listStepsForRequest(request.id);
    expect(updatedSteps[1].status).toBe("PENDING");
    approveStep(hod1, updatedSteps[0].id);
    expect(listStepsForRequest(request.id)[1].status).toBe("ACTIVE");
  });

  it("permanently rejects and cannot be reopened", async () => {
    const requester = createTestUser("requester@spxexpress.com", ["REQUESTER"]);
    const hod1 = createTestUser("hod1@spxexpress.com", ["HOD_APPROVER"]);
    const hub = createTestHub("Visayas Hub", "VIS");
    configureRoute(hub.id, 1, hod1);

    const draft = createDraft(requester, baseForm(hub.id));
    const request = await submitWithDocuments(requester, draft.id);
    const step = listStepsForRequest(request.id)[0];
    const rejected = rejectStep(hod1, step.id, "Figures need to be revised.");

    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toContain("revised");
    const stepAfter = queryOne<{ status: string }>(`SELECT status FROM approval_steps WHERE id = ?`, [step.id]);
    expect(stepAfter?.status).toBe("REJECTED");
  });

  it("versions documents and never overwrites", async () => {
    const requester = createTestUser("requester@spxexpress.com", ["REQUESTER"]);
    const hod1 = createTestUser("hod1@spxexpress.com", ["HOD_APPROVER"]);
    const hub = createTestHub("Mindanao Hub", "MIN");
    configureRoute(hub.id, 1, hod1);

    const draft = createDraft(requester, baseForm(hub.id));
    const request = await submitWithDocuments(requester, draft.id);
    const storage = fakeStorage();
    const v1 = await uploadDocumentVersion(requester, request.id, {
      documentName: "FF Approval",
      originalFilename: "ff-approval.pdf",
      mimeType: "application/pdf",
      size: 100,
      data: Buffer.from("%PDF-1.4")
    }, storage);
    const v2 = await uploadDocumentVersion(requester, request.id, {
      documentName: "FF Approval",
      originalFilename: "ff-approval-v2.pdf",
      mimeType: "application/pdf",
      size: 110,
      data: Buffer.from("%PDF-1.4 updated")
    }, storage);

    expect(v1.versionNumber).toBe(2);
    expect(v2.versionNumber).toBe(3);
    const docs = listDocumentsForRequest(request.id);
    expect(docs).toHaveLength(3);
    const ffApproval = docs.find((document) => document.documentName === "FF Approval");
    expect(ffApproval?.versions).toHaveLength(3);
    expect(storage.files.size).toBe(2);
  });

  it("stops the workflow on withdrawal", async () => {
    const requester = createTestUser("requester@spxexpress.com", ["REQUESTER"]);
    const hod1 = createTestUser("hod1@spxexpress.com", ["HOD_APPROVER"]);
    const hub = createTestHub("NCR Hub", "NCR");
    configureRoute(hub.id, 1, hod1);

    const draft = createDraft(requester, baseForm(hub.id));
    const request = await submitWithDocuments(requester, draft.id);
    const cancelled = withdrawRequest(requester, request.id, "No longer required");
    expect(cancelled.status).toBe("CANCELLED");

    const step = listStepsForRequest(request.id)[0];
    expect(() => approveStep(hod1, step.id)).toThrow(WorkflowError);
  });

  it("allows only one concurrent approval attempt", async () => {
    const requester = createTestUser("requester@spxexpress.com", ["REQUESTER"]);
    const hod1 = createTestUser("hod1@spxexpress.com", ["HOD_APPROVER"]);
    const hub = createTestHub("East Hub", "EST");
    configureRoute(hub.id, 1, hod1);

    const draft = createDraft(requester, baseForm(hub.id));
    const request = await submitWithDocuments(requester, draft.id);
    const step = listStepsForRequest(request.id)[0];
    approveStep(hod1, step.id);
    expect(() => approveStep(hod1, step.id)).toThrow(WorkflowError);
  });

  it("blocks submission until required documents are uploaded", () => {
    const requester = createTestUser("requester@spxexpress.com", ["REQUESTER"]);
    const hod1 = createTestUser("hod1@spxexpress.com", ["HOD_APPROVER"]);
    const hub = createTestHub("North Hub", "NTH");
    configureRoute(hub.id, 1, hod1);

    const draft = createDraft(requester, baseForm(hub.id));
    expect(() => submitRequest(requester, draft.id)).toThrow(/Required documents missing/);
  });

  it("creates watcher users, notifies them, and syncs watched requests", async () => {
    const requester = createTestUser("requester@spxexpress.com", ["REQUESTER"]);
    const hod1 = createTestUser("hod1@spxexpress.com", ["HOD_APPROVER"]);
    const hub = createTestHub("Watch Hub", "WTH");
    configureRoute(hub.id, 1, hod1);

    const draft = createDraft(requester, baseForm(hub.id, {
      watcherEmails: ["watcher.new@spxexpress.com"]
    }));
    const request = await submitWithDocuments(requester, draft.id);
    const watcher = getUserByEmail("watcher.new@spxexpress.com");
    expect(watcher).not.toBeNull();
    expect(watcher?.roles).toContain("WATCHER");
    const watched = listMyWatchedRequests(watcher!.id, { page: 1, pageSize: 20 });
    expect(watched.items.some((item) => item.request.id === request.id)).toBe(true);
    const notification = queryOne<{ type: string }>(
      `SELECT type FROM notifications WHERE user_id = ? AND type = 'WATCHER_ADDED' AND entity_id = ?`,
      [watcher!.id, request.id]
    );
    expect(notification?.type).toBe("WATCHER_ADDED");
    removeSelfFromWatchers(watcher!.id, request.id);
    const afterRemoval = listMyWatchedRequests(watcher!.id, { page: 1, pageSize: 20 });
    expect(afterRemoval.items.some((item) => item.request.id === request.id)).toBe(false);
  });

  it("allows authorized users to add free-form comments", async () => {
    const requester = createTestUser("requester@spxexpress.com", ["REQUESTER"]);
    const hod1 = createTestUser("hod1@spxexpress.com", ["HOD_APPROVER"]);
    const hub = createTestHub("Comment Hub", "CMT");
    configureRoute(hub.id, 1, hod1);

    const draft = createDraft(requester, baseForm(hub.id));
    const request = await submitWithDocuments(requester, draft.id);
    addComment(hod1, request.id, "Please verify the submitted figures.");
    const comments = listCommentsForRequest(request.id);
    expect(comments.some((comment) => comment.type === "NOTE" && comment.message.includes("verify"))).toBe(true);
  });
});
