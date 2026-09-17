import { describe, expect, it } from "vitest";
import { filterRequestsByCriteria } from "@/lib/request-filter";
import type { FreeRequest } from "@/lib/data";

function request(id: string, status: FreeRequest["status"], date: string): FreeRequest {
  return {
    id, workflowId: "hod-approval", requestNumber: id, title: id,
    requesterId: "u1", requesterName: "Requester", requesterEmail: "requester@spxexpress.com",
    hubId: "", hubName: "Hub", status, cpoBudgetStatus: "WITHIN_CPO_BUDGET",
    requiredApproverCount: 1, formData: {}, watcherEmails: [],
    createdAt: date, submittedAt: date, completedAt: null, rejectionReason: null
  };
}

describe("CSV request filtering", () => {
  const requests = [
    request("1", "APPROVED", "2026-09-01T00:00:00.000Z"),
    request("2", "PENDING_APPROVAL", "2026-09-10T00:00:00.000Z")
  ];

  it("filters by status", () => {
    const result = filterRequestsByCriteria(requests, { status: "APPROVED" });
    expect(result.map((r) => r.id)).toEqual(["1"]);
  });

  it("filters by date range", () => {
    const result = filterRequestsByCriteria(requests, { from: "2026-09-02", to: "2026-09-11" });
    expect(result.map((r) => r.id)).toEqual(["2"]);
  });
});
