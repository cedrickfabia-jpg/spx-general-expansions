import { describe, expect, it } from "vitest";
import { FORM_FIELDS } from "@/features/hod-approvals/forms/fields";

describe("HOD Approval form fields", () => {
  it("requires every field except sublease markup and reason for subleasing", () => {
    for (const field of FORM_FIELDS) {
      if (field.key === "subleaseMarkupPercent" || field.key === "reasonForSubleasing") {
        expect(field.required, field.label).toBe(false);
      } else {
        expect(field.required, field.label).toBe(true);
      }
    }
  });
});
