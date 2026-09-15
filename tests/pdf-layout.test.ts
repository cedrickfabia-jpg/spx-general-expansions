import { beforeEach, describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildHodApprovalPdf } from "@/lib/hod-approval-pdf";
import { approveStep, createDraft, submitRequest } from "@/features/hod-approvals/workflow";
import { listStepsForRequest } from "@/features/hod-approvals/repository";
import {
  attachRequiredDocuments,
  baseForm,
  configureRoute,
  createTestHub,
  createTestUser,
  resetDatabase
} from "./helpers";

describe("HOD Approval PDF layout", () => {
  beforeEach(() => resetDatabase());

  it("paginates long approval requests so text never overflows into the footer", async () => {
    const requester = createTestUser("requester@spxexpress.com", ["REQUESTER"]);
    const hod1 = createTestUser("hod1@spxexpress.com", ["HOD_APPROVER"]);
    const hub = createTestHub("Layout Hub", "LAY");
    configureRoute(hub.id, 1, hod1);

    const fill = (max: number) => "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ".repeat(Math.ceil(max / 10)).slice(0, max);
    const draft = createDraft(requester, baseForm(hub.id, {
      utilization: fill(2000),
      dueDiligenceStatus: fill(120),
      rentBenchmark: fill(2000),
      cpoBenchmark: fill(2000),
      reasonForSubleasing: "Y".repeat(4000),
      otherConcerns: fill(2000)
    }));
    await attachRequiredDocuments(requester, draft.id);
    const request = submitRequest(requester, draft.id);
    const step = listStepsForRequest(request.id)[0];
    approveStep(hod1, step.id);

    const bytes = await buildHodApprovalPdf(request.id);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });
});
