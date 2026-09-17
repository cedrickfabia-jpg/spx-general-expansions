import type { AppUser } from "@/features/hod-approvals/types";

export function canSeeMyRequests(user: AppUser): boolean {
  return user.roles.includes("REQUESTER") || user.roles.includes("ADMINISTRATOR");
}

export function canSeeMyApprovals(user: AppUser): boolean {
  return user.roles.includes("ADMINISTRATOR") || user.roles.includes("HOD_1") || user.roles.includes("HOD_2") || user.roles.includes("HOD_APPROVER");
}

export function canSeeMyWatches(user: AppUser): boolean {
  return user.roles.includes("WATCHER") || user.roles.includes("ADMINISTRATOR");
}

export function canSeeAdministration(user: AppUser): boolean {
  return user.roles.includes("ADMINISTRATOR");
}
