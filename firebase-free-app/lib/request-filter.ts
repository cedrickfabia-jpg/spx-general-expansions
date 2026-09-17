import type { FreeRequest } from "@/lib/data";

export function filterRequestsByCriteria(
  requests: FreeRequest[],
  criteria: { from?: string; to?: string; status?: string }
): FreeRequest[] {
  return requests.filter((request) => {
    const date = request.submittedAt || request.createdAt;
    if (criteria.from && date < new Date(`${criteria.from}T00:00:00`).toISOString()) return false;
    if (criteria.to && date > new Date(`${criteria.to}T23:59:59`).toISOString()) return false;
    if (criteria.status && request.status !== criteria.status) return false;
    return true;
  });
}
