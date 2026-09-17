import { describe, expect, it } from "vitest";
import { canSeeAdministration, canSeeMyApprovals, canSeeMyRequests, canSeeMyWatches } from "@/lib/permissions";
import type { AppUser } from "@/features/hod-approvals/types";

function user(roles: AppUser["roles"]): AppUser {
  return { id: "u1", googleId: null, email: "test@spxexpress.com", name: "Test", profilePicture: null, active: true, roles, isAdmin: roles.includes("ADMINISTRATOR") };
}

describe("role-based navigation", () => {
  it("only requester or admin sees My Requests", () => {
    expect(canSeeMyRequests(user(["REQUESTER"]))).toBe(true);
    expect(canSeeMyRequests(user(["ADMINISTRATOR"]))).toBe(true);
    expect(canSeeMyRequests(user(["WATCHER"]))).toBe(false);
  });

  it("only HOD 1, HOD 2, or admin sees My Approvals", () => {
    expect(canSeeMyApprovals(user(["HOD_1"]))).toBe(true);
    expect(canSeeMyApprovals(user(["HOD_2"]))).toBe(true);
    expect(canSeeMyApprovals(user(["ADMINISTRATOR"]))).toBe(true);
    expect(canSeeMyApprovals(user(["REQUESTER"]))).toBe(false);
  });

  it("only watcher or admin sees My Watches", () => {
    expect(canSeeMyWatches(user(["WATCHER"]))).toBe(true);
    expect(canSeeMyWatches(user(["ADMINISTRATOR"]))).toBe(true);
    expect(canSeeMyWatches(user(["REQUESTER"]))).toBe(false);
  });

  it("only administrator sees Administration", () => {
    expect(canSeeAdministration(user(["ADMINISTRATOR"]))).toBe(true);
    expect(canSeeAdministration(user(["REQUESTER"]))).toBe(false);
  });
});
