import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildHodApprovalPdf } from "@/lib/client-pdf";
import type { FreeDocument, FreeRequest, FreeStep } from "@/lib/data";

describe("client PDF generation", () => {
  it("generates a valid PDF for an approved request", async () => {
    const request: FreeRequest = {
      id: "req_1", workflowId: "hod-approval", requestNumber: "APR-2026-000001", title: "Test request",
      requesterId: "u1", requesterName: "Requester", requesterEmail: "requester@spxexpress.com",
      hubId: "", hubName: "Test Hub", status: "APPROVED", cpoBudgetStatus: "WITHIN_CPO_BUDGET",
      requiredApproverCount: 1, formData: { region: "NCR", hubName: "Test Hub" }, watcherEmails: [],
      createdAt: "2026-01-01T00:00:00.000Z", submittedAt: "2026-01-02T00:00:00.000Z", completedAt: "2026-01-03T00:00:00.000Z", rejectionReason: null
    };
    const steps: FreeStep[] = [{
      id: "step_1", requestId: "req_1", sequence: 1, approverId: "h1", approverName: "HOD 1", approverEmail: "hod1@spxexpress.com",
      status: "APPROVED", activatedAt: "2026-01-02T00:00:00.000Z", completedAt: "2026-01-03T00:00:00.000Z", comment: null
    }];
    const documents: FreeDocument[] = [];
    const bytes = await buildHodApprovalPdf(request, steps, documents);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });
});
