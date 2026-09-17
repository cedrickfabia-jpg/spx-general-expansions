import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rules = readFileSync("firestore.rules", "utf8");

describe("Firestore security rules", () => {
  it("prevents users from changing their own roles", () => {
    expect(rules).toContain("request.resource.data.roles == resource.data.roles");
  });

  it("restricts audit log writes", () => {
    expect(rules).toContain("match /auditLogs/{id}");
    expect(rules).toContain("allow update, delete: if false");
  });

  it("restricts error log reads to admins", () => {
    expect(rules).toContain("match /errorLogs/{id}");
    expect(rules).toContain("allow read: if isAdmin()");
  });

  it("restricts archived requests to admins", () => {
    expect(rules).toContain("match /archivedRequests/{id}");
    expect(rules).toContain("allow read, write: if isAdmin()");
  });
});
