export function requiredApproverCount(cpoBudgetStatus: string): 1 | 2 {
  return cpoBudgetStatus === "ABOVE_CPO_BUDGET" ? 2 : 1;
}

export function canActOnStep(approverId: string | undefined, userId: string, isAdmin: boolean): boolean {
  return isAdmin || approverId === userId;
}
