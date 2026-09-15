import { getDb, nowUtc, queryOne, queryRun, transaction } from "@/lib/db";
import type { SqlValue } from "@/lib/db";
import { allocateRequestSequence, newId } from "@/lib/ids";
import { auditLog } from "@/lib/audit";
import { buildApprovalEmail, createNotification } from "@/lib/notifications";
import type { EmailMessage } from "@/lib/email";
import { ensureOrgUser, getUserByEmail, getUserById } from "@/lib/auth";
import { env } from "@/lib/env";
import { yearInTimezone } from "@/lib/time";
import { secureFilename } from "@/lib/utils";
import { HOD_APPROVAL_WORKFLOW_ID } from "@/lib/workflows";
import { canUploadDocuments, canViewRequest, isAssignedApprover, isHodApprover, isRequesterOf } from "@/features/hod-approvals/permissions";
import {
  findHubByName,
  getApproverRoute,
  getHub,
  getRequestById,
  getRequestDetail,
  getSetting,
  getStepById,
  getWorkflowApprover,
  listCommentsForRequest,
  listDocumentsForRequest,
  listStepsForRequest,
  listWatcherUserIds
} from "@/features/hod-approvals/repository";
import { ALLOWED_DOCUMENT_TYPES, REQUIRED_DOCUMENT_TYPES } from "@/features/hod-approvals/forms/fields";
import {
  draftSchema,
  noteSchema,
  questionSchema,
  reasonSchema,
  responseSchema,
  submissionSchema,
  validateFile,
  type DraftInput
} from "@/features/hod-approvals/validation";
import type {
  ApprovalCommentRow,
  ApprovalRequestRow,
  ApprovalStepRow,
  CpoBudgetStatus,
  RequestRevisionRow,
  RoutingDecision
} from "@/features/hod-approvals/types";

export class WorkflowError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "WorkflowError";
    this.status = status;
  }
}

function getRequestOrThrow(requestId: string): ApprovalRequestRow {
  const request = getRequestById(requestId);
  if (!request) throw new WorkflowError("Request not found", 404);
  return request;
}

function getUserOrThrow(userId: string) {
  const user = getUserById(userId);
  if (!user) throw new WorkflowError("User not found", 404);
  return user;
}

function requireRequester(user: NonNullable<ReturnType<typeof getUserById>>, request: ApprovalRequestRow): NonNullable<ReturnType<typeof getUserById>> {
  if (!isRequesterOf(user, request)) {
    throw new WorkflowError("Only the requester can perform this action", 403);
  }
  return user;
}

interface NormalizedDraft extends DraftInput {
  hubName: string;
  region: string;
  hubId: string;
  title: string;
  requestType: string;
  businessJustification: string;
  cpoBudgetStatus: CpoBudgetStatus;
  watcherEmails: string[];
}

function normalizeDraftInput(input: unknown): NormalizedDraft {
  const parsed = draftSchema.parse(input) as DraftInput;
  const hubFromName = parsed.hubName?.trim() ? findHubByName(parsed.hubName) : null;
  if (parsed.hubName?.trim() && !hubFromName && !parsed.hubId) {
    throw new WorkflowError(`Hub not found: ${parsed.hubName.trim()}`, 400);
  }
  const hub = hubFromName ?? (parsed.hubId ? getHub(parsed.hubId) : null);
  const hubId = hub?.id ?? parsed.hubId ?? "";
  const title = parsed.title?.trim() || `HOD Approval - ${hub?.name ?? parsed.hubName?.trim() ?? "New Request"}`;
  const cpoText = parsed.cpoBenchmark ?? "";
  const cpoBudgetStatus: CpoBudgetStatus =
    parsed.cpoBudgetStatus === "WITHIN_CPO_BUDGET" || parsed.cpoBudgetStatus === "ABOVE_CPO_BUDGET"
      ? parsed.cpoBudgetStatus
      : cpoText.toLowerCase().includes("above budget")
        ? "ABOVE_CPO_BUDGET"
        : "WITHIN_CPO_BUDGET";
  return {
    ...parsed,
    hubId,
    hubName: (parsed.hubName ?? "").trim(),
    region: (parsed.region ?? "").trim().toUpperCase(),
    title,
    requestType: parsed.requestType?.trim() || "Expansion",
    businessJustification: parsed.businessJustification?.trim() || "HOD approval request",
    cpoBudgetStatus,
    watcherEmails: parsed.watcherEmails ?? []
  };
}

export function createDraft(requesterId: string, input: unknown): ApprovalRequestRow {
  const requester = getUserOrThrow(requesterId);
  const parsed = normalizeDraftInput(input);
  const id = newId("req");
  const now = nowUtc();
  return transaction(() => {
    queryRun(
      `INSERT INTO approval_requests
        (id, requester_id, hub_id, title, cpo_budget_status, status, data_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`,
      [id, requester.id, parsed.hubId, parsed.title, parsed.cpoBudgetStatus, JSON.stringify(parsed), now, now]
    );
    auditLog({
      actorId: requester.id,
      action: "DRAFT_CREATED",
      entityType: "approval_requests",
      entityId: id,
      metadata: { budgetClassification: parsed.cpoBudgetStatus }
    });
    syncWatchersForRequest(id, parsed.watcherEmails, requester.id);
    notifyWatchersAdded(getRequestById(id)!, parsed.watcherEmails, requester.id);
    return getRequestById(id)!;
  });
}

export function updateDraft(requesterId: string, requestId: string, input: unknown): ApprovalRequestRow {
  const requester = getUserOrThrow(requesterId);
  const parsed = normalizeDraftInput(input);
  return transaction(() => {
    const request = getRequestOrThrow(requestId);
    requireRequester(requester, request);
    if (request.status !== "DRAFT") throw new WorkflowError("Only drafts can be edited", 409);
    queryRun(
      `UPDATE approval_requests SET title = ?, hub_id = ?, cpo_budget_status = ?, data_json = ?, updated_at = ? WHERE id = ?`,
      [parsed.title, parsed.hubId, parsed.cpoBudgetStatus, JSON.stringify(parsed), nowUtc(), requestId]
    );
    auditLog({
      actorId: requester.id,
      action: "DRAFT_UPDATED",
      entityType: "approval_requests",
      entityId: requestId,
      metadata: { budgetClassification: parsed.cpoBudgetStatus }
    });
    syncWatchersForRequest(requestId, parsed.watcherEmails, requester.id);
    notifyWatchersAdded(getRequestById(requestId)!, parsed.watcherEmails, requester.id);
    return getRequestById(requestId)!;
  });
}

export function cancelDraft(requesterId: string, requestId: string, reason: string): ApprovalRequestRow {
  const requester = getUserOrThrow(requesterId);
  const parsedReason = reasonSchema.parse({ reason }).reason;
  return transaction(() => {
    const request = getRequestOrThrow(requestId);
    requireRequester(requester, request);
    if (request.status !== "DRAFT") throw new WorkflowError("Only drafts can be cancelled", 409);
    queryRun(
      `UPDATE approval_requests SET status = 'CANCELLED', cancelled_at = ?, cancellation_reason = ?, updated_at = ? WHERE id = ?`,
      [nowUtc(), parsedReason, nowUtc(), requestId]
    );
    auditLog({
      actorId: requester.id,
      action: "DRAFT_CANCELLED",
      entityType: "approval_requests",
      entityId: requestId,
      metadata: { reason: parsedReason }
    });
    return getRequestById(requestId)!;
  });
}

export interface RoutePreviewStep {
  slot: 1 | 2;
  baseUserId: string;
  assignedUserId: string;
}

export function previewApprovalRoute(hubId: string, budgetStatus: CpoBudgetStatus, at = nowUtc()): { count: number; steps: RoutePreviewStep[] } {
  const count = budgetStatus === "ABOVE_CPO_BUDGET" ? 2 : 1;
  const steps: RoutePreviewStep[] = [];
  for (let slot = 1 as 1 | 2; slot <= count; slot++) {
    const workflowApprover = getWorkflowApprover(HOD_APPROVAL_WORKFLOW_ID, slot);
    const route = workflowApprover ? { approverUserId: workflowApprover.userId } : getApproverRoute(hubId, slot);
    if (!route) throw new WorkflowError(`No HOD Approver ${slot} is configured for this hub`, 400);
    steps.push({
      slot,
      baseUserId: route.approverUserId,
      assignedUserId: route.approverUserId
    });
  }
  return { count, steps };
}

function createSteps(request: ApprovalRequestRow, count: number): ApprovalStepRow[] {
  const now = nowUtc();
  const created: ApprovalStepRow[] = [];
  for (let sequence = 1; sequence <= count; sequence++) {
    const workflowApprover = getWorkflowApprover(HOD_APPROVAL_WORKFLOW_ID, sequence as 1 | 2);
    const route = workflowApprover ? { approverUserId: workflowApprover.userId } : getApproverRoute(request.hubId, sequence as 1 | 2);
    if (!route) {
      throw new WorkflowError(`No HOD Approver ${sequence} is configured for this hub`, 400);
    }
    const id = newId("stp");
    queryRun(
      `INSERT INTO approval_steps
        (id, approval_request_id, sequence, approver_id, original_approver_id, status, activated_at, completed_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', NULL, NULL)`,
      [id, request.id, sequence, route.approverUserId, route.approverUserId, ]
    );
    const row = getStepById(id);
    if (row) created.push(row);
    auditLog({
      actorId: request.requesterId,
      action: "APPROVAL_STEP_CREATED",
      entityType: "approval_steps",
      entityId: id,
      metadata: { sequence, originalApproverId: route.approverUserId }
    });
  }
  void now;
  return created;
}

function activateStepInternal(stepId: string, at = nowUtc()): ApprovalStepRow {
  const step = getStepById(stepId);
  if (!step) throw new WorkflowError("Approval step not found", 404);
  const request = getRequestById(step.approvalRequestId);
  if (!request) throw new WorkflowError("Request not found", 404);
  queryRun(`UPDATE approval_steps SET status = 'ACTIVE', activated_at = ? WHERE id = ?`, [at, stepId]);
  auditLog({
    actorId: request.requesterId,
    action: "APPROVAL_STEP_ACTIVATED",
    entityType: "approval_steps",
    entityId: stepId,
    metadata: { sequence: step.sequence, approverId: step.approverId }
  });
  return getStepById(stepId)!;
}

export function submitRequest(requesterId: string, requestId: string): ApprovalRequestRow {
  const requester = getUserOrThrow(requesterId);
  let request: ApprovalRequestRow;
  transaction(() => {
    request = getRequestOrThrow(requestId);
    requireRequester(requester, request);
    if (request.status !== "DRAFT") throw new WorkflowError("Only drafts can be submitted", 409);
    const data = JSON.parse(request.dataJson) as DraftInput;
    const validated = submissionSchema.parse(data);
    const budgetStatus: CpoBudgetStatus =
      validated.cpoBudgetStatus === "ABOVE_CPO_BUDGET" ? "ABOVE_CPO_BUDGET" : "WITHIN_CPO_BUDGET";
    const uploadedNames = listDocumentsForRequest(requestId).map((document) => document.documentName);
    const missingDocuments = REQUIRED_DOCUMENT_TYPES.filter((type) => !uploadedNames.includes(type));
    if (missingDocuments.length > 0) {
      throw new WorkflowError(`Required documents missing: ${missingDocuments.join(", ")}`, 400);
    }
    const hub = getHub(validated.hubId);
    if (!hub || !hub.active) throw new WorkflowError("Hub is not active", 400);
    const count = budgetStatus === "ABOVE_CPO_BUDGET" ? 2 : 1;
    const sequence = allocateRequestSequence();
    const year = yearInTimezone(nowUtc());
    const requestNumber = `APR-${year}-${String(sequence).padStart(6, "0")}`;
    const now = nowUtc();
    queryRun(
      `UPDATE approval_requests
       SET request_number = ?, required_approver_count = ?, status = 'PENDING_APPROVAL', submitted_at = ?, updated_at = ?,
           current_revision_id = NULL, routing_json = ?
       WHERE id = ?`,
      [requestNumber, count, now, now, JSON.stringify({ determinedAt: now, count }), requestId]
    );
    const revisionId = newId("rev");
    queryRun(
      `INSERT INTO request_revisions (id, approval_request_id, version_number, created_by, reason, data_json, created_at)
       VALUES (?, ?, 1, ?, 'Submitted for approval', ?, ?)`,
      [revisionId, requestId, requester.id, JSON.stringify(validated), now]
    );
    queryRun(`UPDATE approval_requests SET current_revision_id = ? WHERE id = ?`, [revisionId, requestId]);
    const steps = createSteps({ ...getRequestById(requestId)!, cpoBudgetStatus: budgetStatus }, count);
    const routing: RoutingDecision = {
      requiredApproverCount: count,
      approvers: steps.map((step) => ({ slot: step.sequence as 1 | 2, originalApproverId: step.originalApproverId, approverId: step.approverId })),
      determinedAt: now
    };
    queryRun(`UPDATE approval_requests SET routing_json = ? WHERE id = ?`, [JSON.stringify(routing), requestId]);
    activateStepInternal(steps[0].id, now);
    auditLog({
      actorId: requester.id,
      action: "REQUEST_SUBMITTED",
      entityType: "approval_requests",
      entityId: requestId,
      metadata: { requestNumber, budgetClassification: budgetStatus, requiredApproverCount: count }
    });
    auditLog({
      actorId: requester.id,
      action: "APPROVAL_ROUTING_DETERMINED",
      entityType: "approval_requests",
      entityId: requestId,
      metadata: routing as unknown as Record<string, unknown>
    });
    request = getRequestById(requestId)!;
  });
  const resolved = request!;
  notifyApprovalAssigned(resolved);
  notifyWatchersSubmitted(resolved);
  return resolved;
}

function notifyApprovalAssigned(request: ApprovalRequestRow): void {
  const detail = getRequestDetail(request.id);
  if (!detail) return;
  const activeStep = detail.steps.find((step) => step.status === "ACTIVE");
  if (!activeStep) return;
  const approver = getUserById(activeStep.approverId);
  if (!approver) return;
  const email = buildApprovalEmail(request, detail.hub, detail.requester, "Your approval is required");
  createNotification({
    userId: approver.id,
    type: "NEW_APPROVAL_ASSIGNED",
    title: "New approval assigned",
    message: `HOD Approval ${request.requestNumber ?? request.id} is waiting for your action.`,
    entityType: "approval_requests",
    entityId: request.id,
    email: withRecipient(email, approver)
  });
}

function notifyWatchersSubmitted(request: ApprovalRequestRow): void {
  const watcherIds = listWatcherUserIds(request.id);
  for (const watcherId of watcherIds) {
    createNotification({
      userId: watcherId,
      type: "REQUEST_SUBMITTED",
      title: "Request submitted",
      message: `HOD Approval ${request.requestNumber ?? request.id} has been submitted.`,
      entityType: "approval_requests",
      entityId: request.id
    });
  }
}

export function approveStep(actorId: string, stepId: string, comment = ""): ApprovalRequestRow {
  const actor = getUserOrThrow(actorId);
  return transaction(() => {
    const step = getStepById(stepId);
    if (!step) throw new WorkflowError("Approval step not found", 404);
    const request = getRequestOrThrow(step.approvalRequestId);
    if (!isHodApprover(actor)) throw new WorkflowError("Only HOD approvers can approve", 403);
    if (!isAssignedApprover(actor, step)) throw new WorkflowError("You are not assigned to this approval step", 403);
    if (step.status !== "ACTIVE") throw new WorkflowError("This approval step is not active", 409);
    if (!["PENDING_APPROVAL", "QUESTION_RAISED"].includes(request.status)) {
      throw new WorkflowError("Request is not pending approval", 409);
    }
    const now = nowUtc();
    queryRun(
      `UPDATE approval_steps SET status = 'APPROVED', completed_at = ? WHERE id = ? AND status = 'ACTIVE'`,
      [now, stepId]
    );
    queryRun(
      `INSERT INTO approval_actions (id, approval_request_id, approval_step_id, actor_id, action, comment, request_revision_id, created_at)
       VALUES (?, ?, ?, ?, 'APPROVE', ?, ?, ?)`,
      [newId("act"), request.id, stepId, actor.id, comment || null, request.currentRevisionId, now]
    );
    auditLog({ actorId: actor.id, action: "APPROVAL_APPROVED", entityType: "approval_steps", entityId: stepId, metadata: { requestId: request.id } });
    const steps = listStepsForRequest(request.id);
    const nextStep = steps.find((candidate) => candidate.sequence === step.sequence + 1);
    if (nextStep) {
      if (nextStep.status !== "PENDING") throw new WorkflowError("Next approval step is not pending", 409);
      activateStepInternal(nextStep.id, now);
      queryRun(`UPDATE approval_requests SET status = 'PENDING_APPROVAL', updated_at = ? WHERE id = ?`, [now, request.id]);
      auditLog({ actorId: actor.id, action: "NEXT_APPROVAL_STEP_ACTIVATED", entityType: "approval_steps", entityId: nextStep.id, metadata: { requestId: request.id } });
      const updated = getRequestById(request.id)!;
      const nextApprover = getUserById(nextStep.approverId);
      const detail = getRequestDetail(request.id);
      if (nextApprover && detail) {
        const email = buildApprovalEmail(updated, detail.hub, detail.requester, "Your approval is required");
        createNotification({
          userId: nextApprover.id,
          type: "NEW_APPROVAL_ASSIGNED",
          title: "Next approver activated",
          message: `HOD Approval ${updated.requestNumber ?? updated.id} is now waiting for HOD Approver ${nextStep.sequence}.`,
          entityType: "approval_requests",
          entityId: request.id,
          email: withRecipient(email, nextApprover)
        });
      }
      notifyStageParticipants(
        updated,
        "APPROVAL_STEP_COMPLETED",
        "Approval step completed",
        `HOD Approval ${updated.requestNumber ?? updated.id} was approved by HOD Approver ${step.sequence} and is moving to HOD Approver ${nextStep.sequence}.`
      );
      return updated;
    }
    queryRun(`UPDATE approval_requests SET status = 'APPROVED', completed_at = ?, updated_at = ? WHERE id = ?`, [now, now, request.id]);
    auditLog({ actorId: actor.id, action: "FINAL_APPROVAL", entityType: "approval_requests", entityId: request.id, metadata: { stepId, revisionId: request.currentRevisionId } });
    const updated = getRequestById(request.id)!;
    notifyFinalApproval(updated);
    return updated;
  });
}

function notifyFinalApproval(request: ApprovalRequestRow): void {
  const detail = getRequestDetail(request.id);
  if (!detail) return;
  const recipients = [detail.requester, ...detail.watcherUserIds.map((id) => getUserById(id)).filter(Boolean)];
  const email = buildApprovalEmail(request, detail.hub, detail.requester, "HOD approval fully granted");
  for (const user of recipients) {
    if (!user) continue;
    const isWatcher = detail.watcherUserIds.includes(user.id);
    createNotification({
      userId: user.id,
      type: "FINAL_APPROVAL",
      title: "HOD Approval granted",
      message: `HOD Approval ${request.requestNumber ?? request.id} has been fully approved.`,
      entityType: "approval_requests",
      entityId: request.id,
      email: isWatcher && !watcherEmailEnabled(user.id) ? undefined : withRecipient(email, user)
    });
  }
}

export function rejectStep(actorId: string, stepId: string, reason: string): ApprovalRequestRow {
  const actor = getUserOrThrow(actorId);
  const parsedReason = reasonSchema.parse({ reason }).reason;
  return transaction(() => {
    const step = getStepById(stepId);
    if (!step) throw new WorkflowError("Approval step not found", 404);
    const request = getRequestOrThrow(step.approvalRequestId);
    if (!isHodApprover(actor)) throw new WorkflowError("Only HOD approvers can reject", 403);
    if (!isAssignedApprover(actor, step)) throw new WorkflowError("You are not assigned to this approval step", 403);
    if (step.status !== "ACTIVE") throw new WorkflowError("This approval step is not active", 409);
    const now = nowUtc();
    queryRun(
      `UPDATE approval_steps SET status = 'REJECTED', completed_at = ? WHERE id = ? AND status = 'ACTIVE'`,
      [now, stepId]
    );
    queryRun(
      `UPDATE approval_steps SET status = 'CANCELLED' WHERE approval_request_id = ? AND status = 'PENDING'`,
      [request.id]
    );
    queryRun(
      `UPDATE approval_requests SET status = 'REJECTED', rejection_reason = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
      [parsedReason, now, now, request.id]
    );
    queryRun(
      `INSERT INTO approval_actions (id, approval_request_id, approval_step_id, actor_id, action, comment, request_revision_id, created_at)
       VALUES (?, ?, ?, ?, 'REJECT', ?, ?, ?)`,
      [newId("act"), request.id, stepId, actor.id, parsedReason, request.currentRevisionId, now]
    );
    auditLog({ actorId: actor.id, action: "APPROVAL_REJECTED", entityType: "approval_steps", entityId: stepId, metadata: { requestId: request.id, reason: parsedReason } });
    const updated = getRequestById(request.id)!;
    notifyRejected(updated);
    return updated;
  });
}

function notifyRejected(request: ApprovalRequestRow): void {
  const detail = getRequestDetail(request.id);
  if (!detail) return;
  const email = buildApprovalEmail(request, detail.hub, detail.requester, "Request was rejected");
  if (detail.requester) {
    createNotification({
      userId: detail.requester.id,
      type: "REJECTED",
      title: "Request rejected",
      message: `HOD Approval ${request.requestNumber ?? request.id} was rejected.`,
      entityType: "approval_requests",
      entityId: request.id,
      email: withRecipient(email, detail.requester)
    });
  }
  for (const watcherId of detail.watcherUserIds) {
    createNotification({
      userId: watcherId,
      type: "REJECTED",
      title: "Request rejected",
      message: `HOD Approval ${request.requestNumber ?? request.id} was rejected.`,
      entityType: "approval_requests",
      entityId: request.id
    });
  }
}

export function askQuestion(actorId: string, stepId: string, message: string): ApprovalRequestRow {
  const actor = getUserOrThrow(actorId);
  const parsed = questionSchema.parse({ message }).message;
  return transaction(() => {
    const step = getStepById(stepId);
    if (!step) throw new WorkflowError("Approval step not found", 404);
    const request = getRequestOrThrow(step.approvalRequestId);
    if (!isHodApprover(actor)) throw new WorkflowError("Only HOD approvers can ask questions", 403);
    if (!isAssignedApprover(actor, step)) throw new WorkflowError("You are not assigned to this approval step", 403);
    if (step.status !== "ACTIVE") throw new WorkflowError("This approval step is not active", 409);
    if (!["PENDING_APPROVAL", "QUESTION_RAISED"].includes(request.status)) {
      throw new WorkflowError("Request is not pending approval", 409);
    }
    const now = nowUtc();
    const commentId = newId("cmt");
    queryRun(
      `INSERT INTO approval_comments (id, approval_request_id, approval_step_id, author_id, type, message, request_revision_id, created_at)
       VALUES (?, ?, ?, ?, 'QUESTION', ?, ?, ?)`,
      [commentId, request.id, stepId, actor.id, parsed, request.currentRevisionId, now]
    );
    queryRun(
      `INSERT INTO approval_actions (id, approval_request_id, approval_step_id, actor_id, action, comment, request_revision_id, created_at)
       VALUES (?, ?, ?, ?, 'ASK_QUESTION', ?, ?, ?)`,
      [newId("act"), request.id, stepId, actor.id, parsed, request.currentRevisionId, now]
    );
    queryRun(`UPDATE approval_requests SET status = 'QUESTION_RAISED', updated_at = ? WHERE id = ?`, [now, request.id]);
    auditLog({ actorId: actor.id, action: "QUESTION_RAISED", entityType: "approval_requests", entityId: request.id, metadata: { stepId } });
    const updated = getRequestById(request.id)!;
    const detail = getRequestDetail(request.id);
    if (detail?.requester) {
      const email = buildApprovalEmail(updated, detail.hub, detail.requester, "Question raised");
      createNotification({
        userId: detail.requester.id,
        type: "QUESTION_RAISED",
        title: "Question raised",
        message: `HOD Approver asked a question on ${updated.requestNumber ?? updated.id}.`,
        entityType: "approval_requests",
        entityId: request.id,
        email: withRecipient(email, detail.requester)
      });
    }
    notifyStageParticipants(
      updated,
      "QUESTION_RAISED",
      "Question raised",
      `A question was raised on HOD Approval ${updated.requestNumber ?? updated.id}.`,
      { includeRequester: false, includeWatchers: true }
    );
    return updated;
  });
}

export function respondToQuestion(
  requesterId: string,
  requestId: string,
  response: string,
  revision?: { data: Record<string, unknown>; reason: string }
): ApprovalRequestRow {
  const requester = getUserOrThrow(requesterId);
  const parsedResponse = responseSchema.parse({ response }).response;
  return transaction(() => {
    const request = getRequestOrThrow(requestId);
    requireRequester(requester, request);
    if (request.status !== "QUESTION_RAISED") throw new WorkflowError("There is no open question to respond to", 409);
    const activeStep = listStepsForRequest(requestId).find((step) => step.status === "ACTIVE");
    if (!activeStep) throw new WorkflowError("No active approval step found", 409);
    const now = nowUtc();
    let revisionId: string | null = request.currentRevisionId;
    let dataJson = request.dataJson;
    if (revision && Object.keys(revision.data).length > 0) {
      const merged = { ...JSON.parse(request.dataJson), ...revision.data };
      if (revision.data.cpoBudgetStatus && revision.data.cpoBudgetStatus !== request.cpoBudgetStatus) {
        throw new WorkflowError("CPO Budget Status is historical and cannot be changed after submission", 400);
      }
      const version = Math.max(0, ...listRevisionsForRequest(requestId).map((r) => r.versionNumber)) + 1;
      revisionId = newId("rev");
      queryRun(
        `INSERT INTO request_revisions (id, approval_request_id, version_number, created_by, reason, data_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [revisionId, requestId, version, requester.id, revision.reason, JSON.stringify(merged), now]
      );
      dataJson = JSON.stringify(merged);
      queryRun(`UPDATE approval_requests SET data_json = ?, current_revision_id = ?, updated_at = ? WHERE id = ?`, [dataJson, revisionId, now, requestId]);
      auditLog({ actorId: requester.id, action: "REQUEST_REVISION_CREATED", entityType: "request_revisions", entityId: revisionId, metadata: { version, reason: revision.reason } });
    }
    const commentId = newId("cmt");
    queryRun(
      `INSERT INTO approval_comments (id, approval_request_id, approval_step_id, author_id, type, message, request_revision_id, created_at)
       VALUES (?, ?, ?, ?, 'RESPONSE', ?, ?, ?)`,
      [commentId, requestId, activeStep.id, requester.id, parsedResponse, revisionId, now]
    );
    queryRun(
      `INSERT INTO approval_actions (id, approval_request_id, approval_step_id, actor_id, action, comment, request_revision_id, created_at)
       VALUES (?, ?, ?, ?, 'RESPOND_QUESTION', ?, ?, ?)`,
      [newId("act"), requestId, activeStep.id, requester.id, parsedResponse, revisionId, now]
    );
    queryRun(`UPDATE approval_requests SET status = 'PENDING_APPROVAL', updated_at = ? WHERE id = ?`, [now, requestId]);
    auditLog({ actorId: requester.id, action: "QUESTION_RESPONDED", entityType: "approval_requests", entityId: requestId, metadata: { stepId: activeStep.id } });
    const updated = getRequestById(requestId)!;
    const approver = getUserById(activeStep.approverId);
    const detail = getRequestDetail(requestId);
    if (approver && detail) {
      const email = buildApprovalEmail(updated, detail.hub, detail.requester, "Requester responded");
      createNotification({
        userId: approver.id,
        type: "QUESTION_RESPONSE",
        title: "Requester responded",
        message: `The requester responded to your question on ${updated.requestNumber ?? updated.id}.`,
        entityType: "approval_requests",
        entityId: requestId,
        email: withRecipient(email, approver)
      });
    }
    notifyStageParticipants(
      updated,
      "QUESTION_RESPONDED",
      "Question answered",
      `The requester responded to a question on HOD Approval ${updated.requestNumber ?? updated.id}.`,
      { includeRequester: false, includeWatchers: true }
    );
    return updated;
  });
}

function listRevisionsForRequest(requestId: string): RequestRevisionRow[] {
  return queryAllSafe<RequestRevisionRow>(
    `SELECT id, approval_request_id AS approvalRequestId, version_number AS versionNumber, created_by AS createdBy,
            reason, data_json AS dataJson, created_at AS createdAt
     FROM request_revisions WHERE approval_request_id = ? ORDER BY version_number ASC`,
    [requestId]
  );
}

export function addComment(actorId: string, requestId: string, message: string): ApprovalCommentRow {
  const actor = getUserOrThrow(actorId);
  const parsed = noteSchema.parse({ message }).message;
  return transaction(() => {
    const request = getRequestOrThrow(requestId);
    const detail = getRequestDetail(requestId);
    if (!detail) throw new WorkflowError("Request not found", 404);
    const stepApproverIds = detail.steps.map((step) => [step.approverId, step.originalApproverId]).flat();
    if (!canViewRequest(actor, request, detail.watcherUserIds, stepApproverIds)) {
      throw new WorkflowError("You cannot comment on this request", 403);
    }
    const id = newId("cmt");
    const now = nowUtc();
    queryRun(
      `INSERT INTO approval_comments (id, approval_request_id, approval_step_id, author_id, type, message, request_revision_id, created_at)
       VALUES (?, ?, NULL, ?, 'NOTE', ?, ?, ?)`,
      [id, requestId, actor.id, parsed, request.currentRevisionId, now]
    );
    queryRun(
      `INSERT INTO approval_actions (id, approval_request_id, approval_step_id, actor_id, action, comment, request_revision_id, created_at)
       VALUES (?, ?, NULL, ?, 'NOTE', ?, ?, ?)`,
      [newId("act"), requestId, actor.id, parsed, request.currentRevisionId, now]
    );
    auditLog({ actorId: actor.id, action: "COMMENT_ADDED", entityType: "approval_comments", entityId: id, metadata: { requestId } });
    return listCommentsForRequest(requestId).find((comment) => comment.id === id)!;
  });
}

export function removeSelfFromWatchers(userId: string, requestId: string): { ok: boolean } {
  const user = getUserOrThrow(userId);
  transaction(() => {
    const request = getRequestOrThrow(requestId);
    queryRun(`DELETE FROM approval_watchers WHERE approval_request_id = ? AND user_id = ?`, [requestId, userId]);
    auditLog({
      actorId: user.id,
      action: "WATCHER_REMOVED_SELF",
      entityType: "approval_watchers",
      entityId: requestId,
      metadata: { requestId }
    });
  });
  return { ok: true };
}

export function withdrawRequest(requesterId: string, requestId: string, reason: string): ApprovalRequestRow {
  const requester = getUserOrThrow(requesterId);
  const parsedReason = reasonSchema.parse({ reason }).reason;
  return transaction(() => {
    const request = getRequestOrThrow(requestId);
    requireRequester(requester, request);
    if (!["PENDING_APPROVAL", "QUESTION_RAISED"].includes(request.status)) {
      throw new WorkflowError("Only pending requests can be withdrawn", 409);
    }
    const now = nowUtc();
    queryRun(
      `UPDATE approval_steps SET status = 'CANCELLED', completed_at = ? WHERE approval_request_id = ? AND status IN ('ACTIVE','PENDING')`,
      [now, requestId]
    );
    queryRun(
      `UPDATE approval_requests SET status = 'CANCELLED', cancelled_at = ?, cancellation_reason = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
      [now, parsedReason, now, now, requestId]
    );
    queryRun(
      `INSERT INTO approval_actions (id, approval_request_id, actor_id, action, comment, request_revision_id, created_at)
       VALUES (?, ?, ?, 'WITHDRAW', ?, ?, ?)`,
      [newId("act"), requestId, requester.id, parsedReason, request.currentRevisionId, now]
    );
    auditLog({ actorId: requester.id, action: "REQUEST_WITHDRAWN", entityType: "approval_requests", entityId: requestId, metadata: { reason: parsedReason } });
    const updated = getRequestById(requestId)!;
    notifyWithdrawn(updated);
    return updated;
  });
}

function notifyWithdrawn(request: ApprovalRequestRow): void {
  const detail = getRequestDetail(request.id);
  if (!detail) return;
  const stepApproverIds = [...new Set(detail.steps.map((step) => [step.approverId, step.originalApproverId]).flat())];
  for (const userId of stepApproverIds) {
    const user = getUserById(userId);
    if (!user) continue;
    createNotification({
      userId: user.id,
      type: "WITHDRAWN",
      title: "Request withdrawn",
      message: `HOD Approval ${request.requestNumber ?? request.id} was withdrawn by the requester.`,
      entityType: "approval_requests",
      entityId: request.id
    });
  }
  for (const watcherId of detail.watcherUserIds) {
    createNotification({
      userId: watcherId,
      type: "WITHDRAWN",
      title: "Request withdrawn",
      message: `HOD Approval ${request.requestNumber ?? request.id} was withdrawn.`,
      entityType: "approval_requests",
      entityId: request.id
    });
  }
}

export interface UploadDocumentInput {
  documentName?: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  data: Buffer;
}

export async function uploadDocumentVersion(
  actorId: string,
  requestId: string,
  input: UploadDocumentInput,
  storage: { put(key: string, data: Buffer, contentType: string): Promise<void>; delete(key: string): Promise<void> }
): Promise<{ documentId: string; versionNumber: number; storageKey: string }> {
  return uploadDocumentVersionAsync(actorId, requestId, input, storage);
}
function queryAllSafe<T>(sql: string, params: SqlValue[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

function syncWatchersForRequest(requestId: string, emails: string[], actorId: string): void {
  queryRun(`DELETE FROM approval_watchers WHERE approval_request_id = ?`, [requestId]);
  for (const email of emails) {
    const user = getUserByEmail(email) ?? ensureOrgUser(email);
    if (user) {
      queryRun(
        `INSERT OR IGNORE INTO approval_watchers (approval_request_id, user_id, added_by, created_at)
         VALUES (?, ?, ?, ?)`,
        [requestId, user.id, actorId, nowUtc()]
      );
    }
  }
}

function notifyWatchersAdded(request: ApprovalRequestRow, emails: string[], _actorId: string): void {
  const detail = getRequestDetail(request.id);
  if (!detail) return;
  for (const email of emails) {
    const user = getUserByEmail(email);
    if (!user) continue;
    const emailMessage = buildApprovalEmail(request, detail.hub, detail.requester, "You were added as a watcher");
    const emailEnabled = watcherEmailEnabled(user.id);
    createNotification({
      userId: user.id,
      type: "WATCHER_ADDED",
      title: "Added as watcher",
      message: `You were added as a watcher to ${request.requestNumber ?? request.id}.`,
      entityType: "approval_requests",
      entityId: request.id,
      email: emailEnabled ? withRecipient(emailMessage, user) : undefined
    });
  }
}

function watcherEmailEnabled(userId: string): boolean {
  const value = String(getSetting(`watcherEmailFrequency:${userId}`, "IMMEDIATE"));
  return value !== "OFF";
}

function notifyStageParticipants(
  request: ApprovalRequestRow,
  type: string,
  title: string,
  message: string,
  options: { includeRequester?: boolean; includeWatchers?: boolean; approverIds?: string[] } = {}
): void {
  const detail = getRequestDetail(request.id);
  if (!detail) return;
  const ids = new Set<string>();
  if (options.includeRequester !== false && detail.requester) ids.add(detail.requester.id);
  if (options.includeWatchers !== false) {
    for (const watcherId of detail.watcherUserIds) ids.add(watcherId);
  }
  for (const approverId of options.approverIds ?? []) ids.add(approverId);
  for (const userId of ids) {
    const user = getUserById(userId);
    if (!user) continue;
    const isAssignedApprover = (options.approverIds ?? []).includes(user.id);
    const isRequester = detail.requester?.id === user.id;
    if (user.isAdmin && !isRequester && !isAssignedApprover) continue;
    createNotification({
      userId: user.id,
      type,
      title,
      message,
      entityType: "approval_requests",
      entityId: request.id
    });
  }
}

function withRecipient(
  email: { subject: string; text: string },
  user: { id: string; email: string }
): EmailMessage {
  return { ...email, to: [user.email] };
}

async function uploadDocumentVersionAsync(
  actorId: string,
  requestId: string,
  input: UploadDocumentInput,
  storage: { put(key: string, data: Buffer, contentType: string): Promise<void>; delete(key: string): Promise<void> }
): Promise<{ documentId: string; versionNumber: number; storageKey: string }> {
  const actor = getUserOrThrow(actorId);
  const request = getRequestOrThrow(requestId);
  if (!canUploadDocuments(actor, request)) {
    throw new WorkflowError("You are not allowed to upload documents to this request", 403);
  }
  const fileError = validateFile({ name: input.originalFilename, size: input.size, type: input.mimeType }, env.maxFileSizeBytes);
  if (fileError) throw new WorkflowError(fileError, 400);
  const requestedName = input.documentName?.trim() ?? "";
  if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(requestedName)) {
    throw new WorkflowError("Document type must be FF Approval, CPO Table, Hub Location Scoring, Optional file 1, Optional file 2, or Optional file 3", 400);
  }
  const safeName = secureFilename(input.originalFilename);
  const documentName = requestedName;
  const existing = queryOne<{ id: string }>(
    `SELECT id FROM documents WHERE approval_request_id = ? AND document_name = ?`,
    [requestId, documentName]
  );
  const documentId = existing?.id ?? newId("doc");
  const versionRow = queryOne<{ version_number: number }>(
    `SELECT COALESCE(MAX(version_number), 0) AS version_number FROM document_versions WHERE document_id = ?`,
    [documentId]
  );
  const versionNumber = (versionRow?.version_number ?? 0) + 1;
  const storageKey = `requests/${requestId}/${documentId}/v${versionNumber}-${safeName}`;
  await storage.put(storageKey, input.data, input.mimeType);
  try {
    transaction(() => {
      if (!existing) {
        queryRun(
          `INSERT INTO documents (id, approval_request_id, document_name, document_type, created_by, created_at)
           VALUES (?, ?, ?, 'REQUIRED', ?, ?)`,
          [documentId, requestId, documentName, actor.id, nowUtc()]
        );
        auditLog({ actorId: actor.id, action: "DOCUMENT_CREATED", entityType: "documents", entityId: documentId, metadata: { requestId } });
      }
      const versionId = newId("dvs");
      queryRun(
        `INSERT INTO document_versions (id, document_id, version_number, storage_key, original_filename, mime_type, file_size, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [versionId, documentId, versionNumber, storageKey, input.originalFilename, input.mimeType, input.size, actor.id, nowUtc()]
      );
      auditLog({ actorId: actor.id, action: "DOCUMENT_VERSION_CREATED", entityType: "document_versions", entityId: versionId, metadata: { documentId, versionNumber, requestId } });
    });
  } catch (error) {
    await storage.delete(storageKey);
    throw error;
  }
  notifyDocumentUpdate(request);
  return { documentId, versionNumber, storageKey };
}

function notifyDocumentUpdate(request: ApprovalRequestRow): void {
  const detail = getRequestDetail(request.id);
  if (!detail) return;
  const activeApproverIds = detail.steps.filter((step) => step.status === "ACTIVE").map((step) => step.approverId);
  for (const userId of activeApproverIds) {
    const user = getUserById(userId);
    if (!user) continue;
    const email = buildApprovalEmail(request, detail.hub, detail.requester, "Supporting document updated");
    createNotification({
      userId: user.id,
      type: "DOCUMENT_UPDATE",
      title: "Document update",
      message: `A supporting document was added to ${request.requestNumber ?? request.id}.`,
      entityType: "approval_requests",
      entityId: request.id,
      email: withRecipient(email, user)
    });
  }
  for (const watcherId of detail.watcherUserIds) {
    createNotification({
      userId: watcherId,
      type: "DOCUMENT_UPDATE",
      title: "Document update",
      message: `A supporting document was added to ${request.requestNumber ?? request.id}.`,
      entityType: "approval_requests",
      entityId: request.id
    });
  }
}
