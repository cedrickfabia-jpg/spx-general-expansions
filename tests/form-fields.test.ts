import { beforeEach, describe, expect, it } from "vitest";
import { queryOne } from "@/lib/db";
import { createDraft, submitRequest } from "@/features/hod-approvals/workflow";
import { attachRequiredDocuments, baseForm, configureRoute, createTestHub, createTestUser, resetDatabase } from "./helpers";

describe("official template form fields", () => {
  beforeEach(() => resetDatabase());

  it("persists template-derived expansion fields through submission", async () => {
    const requester = createTestUser("requester@spxexpress.com", ["REQUESTER"]);
    const hod1 = createTestUser("hod1@spxexpress.com", ["HOD_APPROVER"]);
    const hub = createTestHub("Butuan Hub", "BTU");
    configureRoute(hub.id, 1, hod1);

    const draft = createDraft(requester, baseForm(hub.id, {
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
      reasonForSubleasing: "Only viable option to secure the site.",
      facilityWork: "Facility Ready for Fit-Out",
      locationScore: "86.17%",
      dueDiligenceStatus: "Completed",
      utilization: "1. Existing hub - Pre split: 92.73% - Post-split: 52.65%; 2. Proposed Site: 25.61%",
      rentBenchmarkEscalation: "Benchmark PHP 350/sqm; 5% yearly escalation",
      cpoBenchmark: "Benchmark $0.031; Actual $0.019",
      securityDeposit: "No SecDep if under Subleasing",
      renovation: "Required - SPX to shoulder",
      renovationType: "Major Works",
      otherConcerns: "N/A",
      adoTotal: "3,042.02",
      lastMile: "3,038.70",
      firstMile: "9.95",
      totalLeasedAreaSize: "400 sqm",
      indoorSize: "300 sqm",
      outdoorSize: "100 sqm",
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
      utilityDepositPhp: "0 months"
    }));
    await attachRequiredDocuments(requester, draft.id);
    const request = submitRequest(requester, draft.id);
    const row = queryOne<{ dataJson: string }>(`SELECT data_json AS dataJson FROM approval_requests WHERE id = ?`, [request.id]);
    const data = JSON.parse(row?.dataJson ?? "{}") as Record<string, string>;

    expect(data.pipeline).toBe("Yes");
    expect(data.expansionType).toBe("Split");
    expect(data.siteName).toBe("Butuan Libertad Hub");
    expect(data.leaseType).toBe("Sublease");
    expect(data.utilization).toContain("Proposed Site");
    expect(data.totalLeasedAreaSize).toBe("400 sqm");
    expect(data.lessorSublessor).toBe("Genuine CDO Realty");
  });
});
