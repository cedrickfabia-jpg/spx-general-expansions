import { z } from "zod";

const emailSchema = z.string().trim().email().max(254);

const submissionRequiredLabels: Record<string, string> = {
  hubName: "Hub Name",
  region: "Region",
  pipeline: "Pipeline",
  facilityType: "Facility Type",
  expansionType: "Expansion Type",
  utilization: "Utilization",
  leaseType: "Lease Type",
  facilityWork: "Facility Work",
  locationScore: "Location Score",
  dueDiligenceStatus: "Due Diligence Status",
  rentBenchmark: "Rent Benchmark",
  rentEscalation: "Escalation",
  cpoBenchmark: "CPO",
  securityDeposit: "Security Deposit",
  renovation: "Renovation",
  renovationType: "Renovation Type",
  cpoBudgetStatus: "CPO Budget Status"
};

export const draftSchema = z.object({
  title: z.string().trim().max(200).optional().default(""),
  requestType: z.string().trim().max(120).optional().default(""),
  businessJustification: z.string().trim().max(4000).optional().default(""),
  expectedOutcome: z.string().trim().max(2000).optional().default(""),
  operationalImpact: z.string().trim().max(2000).optional().default(""),
  requiredDate: z.string().trim().refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Required date must be a valid date").optional().default(""),
  targetCompletionDate: z.string().trim().refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Target completion date must be a valid date").optional().default(""),
  estimatedAmount: z.string().trim().max(40).optional().default(""),
  currency: z.string().trim().max(8).optional().default("PHP"),
  costCenter: z.string().trim().max(120).optional().default(""),
  hubId: z.string().trim().max(200).optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  facility: z.string().trim().max(200).optional().default(""),
  hubName: z.string().trim().max(200).optional().default(""),
  region: z.string().trim().max(80).optional().default(""),
  pipeline: z.string().trim().max(20).optional().default(""),
  facilityType: z.string().trim().max(120).optional().default(""),
  expansionType: z.string().trim().max(40).optional().default(""),
  siteName: z.string().trim().max(200).optional().default(""),
  state: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  district: z.string().trim().max(120).optional().default(""),
  completeAddress: z.string().trim().max(500).optional().default(""),
  coordinates: z.string().trim().max(100).optional().default(""),
  expansionsPIC: z.string().trim().max(200).optional().default(""),
  areaManager: z.string().trim().max(200).optional().default(""),
  leaseType: z.string().trim().max(40).optional().default(""),
  subleaseMarkupPercent: z.string().trim().max(40).optional().default(""),
  reasonForSubleasing: z.string().trim().max(4000).optional().default(""),
  facilityWork: z.string().trim().max(300).optional().default(""),
  locationScore: z.string().trim().max(120).optional().default(""),
  dueDiligenceStatus: z.string().trim().max(120).optional().default(""),
  rentBenchmarkEscalation: z.string().trim().max(2000).optional().default(""),
  rentBenchmark: z.string().trim().max(2000).optional().default(""),
  rentEscalation: z.string().trim().max(200).optional().default(""),
  cpoBenchmark: z.string().trim().max(2000).optional().default(""),
  securityDeposit: z.string().trim().max(500).optional().default(""),
  renovation: z.string().trim().max(300).optional().default(""),
  renovationType: z.string().trim().max(300).optional().default(""),
  otherConcerns: z.string().trim().max(2000).optional().default(""),
  adoTotal: z.string().trim().max(120).optional().default(""),
  lastMile: z.string().trim().max(120).optional().default(""),
  firstMile: z.string().trim().max(120).optional().default(""),
  totalLeasedAreaSize: z.string().trim().max(120).optional().default(""),
  indoorSize: z.string().trim().max(120).optional().default(""),
  outdoorSize: z.string().trim().max(120).optional().default(""),
  utilization: z.string().trim().max(2000).optional().default(""),
  monthlyRentVatExclusive: z.string().trim().max(120).optional().default(""),
  renovationEstimate: z.string().trim().max(120).optional().default(""),
  renovationDepreciation: z.string().trim().max(120).optional().default(""),
  totalMonthlyCost: z.string().trim().max(120).optional().default(""),
  cpoRentRenovation: z.string().trim().max(120).optional().default(""),
  cpoRent: z.string().trim().max(120).optional().default(""),
  cpoRenov: z.string().trim().max(120).optional().default(""),
  lessorSublessor: z.string().trim().max(200).optional().default(""),
  contractTermMonths: z.string().trim().max(80).optional().default(""),
  yearlyEscalationRate: z.string().trim().max(80).optional().default(""),
  advanceRentPhp: z.string().trim().max(120).optional().default(""),
  securityDepositPhp: z.string().trim().max(120).optional().default(""),
  utilityDepositPhp: z.string().trim().max(120).optional().default(""),
  cpoBudgetStatus: z.union([z.literal("WITHIN_CPO_BUDGET"), z.literal("ABOVE_CPO_BUDGET"), z.literal("")]).optional().default(""),
  watcherEmails: z.array(emailSchema).max(20).optional().default([]),
  notes: z.string().trim().max(3000).optional().default("")
});

export const submissionSchema = draftSchema.superRefine((data, ctx) => {
  for (const [key, label] of Object.entries(submissionRequiredLabels)) {
    const value = data[key as keyof typeof data];
    if (typeof value === "string" && value.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `${label} is required`
      });
    }
  }
  if (typeof data.region === "string" && data.region.trim() !== "" && data.region !== data.region.toUpperCase()) {
    ctx.addIssue({
      code: "custom",
      path: ["region"],
      message: "Region must be uppercase"
    });
  }
  if (!Array.isArray(data.watcherEmails) || data.watcherEmails.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["watcherEmails"],
      message: "At least one watcher email is required"
    });
  }
  if (data.estimatedAmount) {
    const amount = Number(data.estimatedAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["estimatedAmount"],
        message: "Estimated amount must be a positive number"
      });
    }
  }
});

export type DraftInput = z.infer<typeof draftSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;

export const questionSchema = z.object({
  message: z.string().trim().min(2, "Question message is required").max(3000)
});

export const responseSchema = z.object({
  response: z.string().trim().min(2, "Response is required").max(4000)
});

export const noteSchema = z.object({
  message: z.string().trim().min(2, "Comment is required").max(3000)
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(5, "A reason is required").max(2000)
});

export const allowedMimeTypes = new Set([
  "application/pdf"
]);

export const allowedExtensions = new Set([
  ".pdf"
]);

export function validateFile(file: { name: string; size: number; type: string }, maxBytes: number): string | null {
  if (file.size <= 0) return "File is empty";
  if (file.size > maxBytes) return "File exceeds the maximum allowed size";
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  if (!allowedExtensions.has(ext)) return "File type is not allowed";
  if (!allowedMimeTypes.has(file.type)) return "File type is not allowed";
  return null;
}
