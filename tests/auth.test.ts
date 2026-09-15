import { describe, expect, it } from "vitest";
import { assertAllowedEmail, createSessionToken, grantOrgAccess, upsertUserForDevLogin, verifySessionToken } from "@/lib/auth";
import { getWorkflowApprover, listWorkflowAccess } from "@/features/hod-approvals/repository";
import { HOD_APPROVAL_WORKFLOW_ID } from "@/lib/workflows";
import { resetDatabase, createTestUser } from "./helpers";

describe("authentication", () => {
  it("allows only the organizational domain", () => {
    expect(assertAllowedEmail("user@spxexpress.com")).toBe("user@spxexpress.com");
    expect(assertAllowedEmail("User@SPXExpress.com")).toBe("user@spxexpress.com");
    expect(() => assertAllowedEmail("user@gmail.com")).toThrow();
    expect(() => assertAllowedEmail("user@yahoo.com")).toThrow();
    expect(() => assertAllowedEmail("user@othercompany.com")).toThrow();
  });

  it("signs and verifies session tokens", async () => {
    resetDatabase();
    const userId = createTestUser("session@spxexpress.com", ["REQUESTER", "HOD_APPROVER"]);
    const user = (await import("@/lib/auth")).getUserById(userId)!;
    const token = await createSessionToken(user);
    const claims = await verifySessionToken(token);
    expect(claims?.sub).toBe(userId);
    expect(claims?.email).toBe("session@spxexpress.com");
    expect(claims?.roles).toContain("HOD_APPROVER");
  });

  it("rejects tampered tokens", async () => {
    const claims = await verifySessionToken("not-a-real-token");
    expect(claims).toBeNull();
  });

  it("makes cedrick.fabia@spxexpress.com an administrator", () => {
    resetDatabase();
    const user = upsertUserForDevLogin({ email: "cedrick.fabia@spxexpress.com" });
    expect(user.isAdmin).toBe(true);
    expect(user.roles).toContain("ADMINISTRATOR");
  });

  it("gives new org users watcher access by default", () => {
    resetDatabase();
    const watcher = upsertUserForDevLogin({ email: "new.org@spxexpress.com" });
    expect(watcher.roles).toEqual(["WATCHER"]);
  });

  it("grants org access by email with administrator or requester view", () => {
    resetDatabase();
    const requester = grantOrgAccess("requester.new@spxexpress.com", "REQUESTER");
    expect(requester.roles).toEqual(["REQUESTER"]);
    const access = listWorkflowAccess(HOD_APPROVAL_WORKFLOW_ID);
    expect(access.some((item) => item.userEmail === "requester.new@spxexpress.com" && item.accessType === "REQUESTER")).toBe(true);
    const admin = grantOrgAccess("admin.new@spxexpress.com", "ADMINISTRATOR");
    expect(admin.roles).toEqual(["ADMINISTRATOR"]);
    const cedrickAdmin = grantOrgAccess("cedrick.fabia@spxexpress.com", "REQUESTER");
    expect(cedrickAdmin.roles).toContain("ADMINISTRATOR");
  });

  it("keeps only one user per HOD 1 and HOD 2 slot", () => {
    resetDatabase();
    const first = grantOrgAccess("hod1.first@spxexpress.com", "HOD_1");
    const second = grantOrgAccess("hod1.second@spxexpress.com", "HOD_1");
    expect(getWorkflowApprover(HOD_APPROVAL_WORKFLOW_ID, 1)?.userId).toBe(second.id);
    const access = listWorkflowAccess(HOD_APPROVAL_WORKFLOW_ID);
    expect(access.some((item) => item.userEmail === "hod1.first@spxexpress.com" && item.accessType === "HOD_1")).toBe(false);
    expect(access.some((item) => item.userEmail === "hod1.second@spxexpress.com" && item.accessType === "HOD_1")).toBe(true);
    expect(first.roles).toContain("HOD_APPROVER");
    const hod2 = grantOrgAccess("hod2.only@spxexpress.com", "HOD_2");
    expect(getWorkflowApprover(HOD_APPROVAL_WORKFLOW_ID, 2)?.userId).toBe(hod2.id);
  });
});
