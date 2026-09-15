import type { AppUser, ApprovalRequestRow, ApprovalStepRow, RoleName } from "@/features/hod-approvals/types";

export function hasRole(user: AppUser, role: RoleName): boolean {
  return user.roles.includes(role);
}

export function isAdmin(user: AppUser): boolean {
  return hasRole(user, "ADMINISTRATOR");
}

export function isHodApprover(user: AppUser): boolean {
  return hasRole(user, "HOD_APPROVER");
}

export function isRequesterOf(user: AppUser, request: ApprovalRequestRow): boolean {
  return user.id === request.requesterId;
}

export function isAssignedApprover(user: AppUser, step: ApprovalStepRow): boolean {
  return user.id === step.approverId;
}

export function canActOnStep(user: AppUser, request: ApprovalRequestRow, step: ApprovalStepRow): boolean {
  if (!["PENDING_APPROVAL", "QUESTION_RAISED"].includes(request.status)) return false;
  if (step.status !== "ACTIVE") return false;
  if (!isHodApprover(user)) return false;
  return isAssignedApprover(user, step);
}

export function canViewRequest(
  user: AppUser,
  request: ApprovalRequestRow,
  watcherUserIds: string[],
  stepApproverIds: string[]
): boolean {
  if (isAdmin(user)) return true;
  if (isRequesterOf(user, request)) return true;
  if (watcherUserIds.includes(user.id)) return true;
  if (stepApproverIds.includes(user.id)) return true;
  return false;
}

export function canRespondToQuestion(user: AppUser, request: ApprovalRequestRow): boolean {
  return request.status === "QUESTION_RAISED" && isRequesterOf(user, request);
}

export function canWithdraw(user: AppUser, request: ApprovalRequestRow): boolean {
  return isRequesterOf(user, request) && ["PENDING_APPROVAL", "QUESTION_RAISED"].includes(request.status);
}

export function canUploadDocuments(user: AppUser, request: ApprovalRequestRow): boolean {
  if (isAdmin(user)) return true;
  if (isRequesterOf(user, request)) {
    return ["DRAFT", "PENDING_APPROVAL", "QUESTION_RAISED"].includes(request.status);
  }
  return false;
}
