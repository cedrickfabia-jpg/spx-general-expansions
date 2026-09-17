import { describe, expect, it } from "vitest";
import { canActOnStep, requiredApproverCount } from "@/lib/workflow-rules";

describe("HOD Approval routing rules", () => {
  it("routes within CPO budget to one approver", () => {
    expect(requiredApproverCount("WITHIN_CPO_BUDGET")).toBe(1);
  });

  it("routes above CPO budget to two approvers", () => {
    expect(requiredApproverCount("ABOVE_CPO_BUDGET")).toBe(2);
  });

  it("lets admins act on any step", () => {
    expect(canActOnStep("hod2", "admin", true)).toBe(true);
  });

  it("blocks a non-assigned approver", () => {
    expect(canActOnStep("hod1", "hod2", false)).toBe(false);
  });
});
