import type { HODApprovalFormData } from "@/features/hod-approvals/types";

export interface FormFieldConfig {
  key: keyof HODApprovalFormData;
  label: string;
  section: string;
  type: "text" | "textarea" | "date" | "currency" | "select";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export const FORM_FIELDS: FormFieldConfig[] = [
  { key: "hubName", label: "Hub Name", section: "Hub", type: "text", required: true, placeholder: "Enter hub name" },
  { key: "region", label: "Region", section: "Hub", type: "select", required: true, options: ["NOL", "SOL", "NCR", "VIS", "MIN"] },
  { key: "pipeline", label: "Pipeline", section: "Request Details", type: "select", required: true, options: ["Yes", "No"] },
  { key: "facilityType", label: "Facility Type", section: "Request Details", type: "select", required: true, options: ["Hub", "RC", "MFM", "SOC", "Parking", "DOP"] },
  { key: "expansionType", label: "Expansion Type", section: "Request Details", type: "select", required: true, options: ["Split", "New Coverage", "Transfer", "Renewal", "Renewal+Downsizing"] },
  { key: "existingHubPreSplit", label: "Utilization - Existing Hub Pre-split (%)", section: "Utilization", type: "text", required: true, placeholder: "xx%" },
  { key: "existingHubPostSplit", label: "Utilization - Existing Hub Post-split (%)", section: "Utilization", type: "text", required: true, placeholder: "xx%" },
  { key: "proposedSitePre", label: "Utilization - Proposed Site Pre (%)", section: "Utilization", type: "text", required: true, placeholder: "xx%" },
  { key: "proposedSitePost", label: "Utilization - Proposed Site Post (%)", section: "Utilization", type: "text", required: true, placeholder: "xx%" },
  { key: "leaseType", label: "Lease Type", section: "Lease Details", type: "select", required: true, options: ["Direct Lease", "Sublease"] },
  { key: "subleaseMarkupPercent", label: "Sublease Mark-Up %", section: "Lease Details", type: "text", required: false, placeholder: "xx%" },
  { key: "reasonForSubleasing", label: "Reason for Subleasing", section: "Lease Details", type: "textarea", required: false, placeholder: "State reason if sublease, otherwise write N/A" },
  { key: "facilityWork", label: "Facility Work", section: "Request Details", type: "select", required: true, options: ["BTS Ground Zero", "BTS Fit-Out", "Facility Ready for Fit-Out"] },
  { key: "locationScore", label: "Location Score", section: "Request Details", type: "text", required: true, placeholder: "xx / 100" },
  { key: "businessPermit", label: "Due Diligence - Business Permit", section: "Due Diligence", type: "select", required: true, options: ["Yes", "No"] },
  { key: "occupancyPermit", label: "Due Diligence - Occupancy Permit", section: "Due Diligence", type: "select", required: true, options: ["Yes", "No"] },
  { key: "taxDeclaration", label: "Due Diligence - Tax Declaration", section: "Due Diligence", type: "select", required: true, options: ["Yes", "No"] },
  { key: "zoningClearance", label: "Due Diligence - Zoning Clearance", section: "Due Diligence", type: "select", required: true, options: ["Yes", "No"] },
  { key: "tct", label: "Due Diligence - TCT", section: "Due Diligence", type: "select", required: true, options: ["Yes", "No"] },
  { key: "rentBenchmark", label: "Rent Benchmark (PHP/sqm)", section: "Financial Details", type: "text", required: true, placeholder: "PHP xx/sqm" },
  { key: "rentActual", label: "Rent Actual (PHP/sqm)", section: "Financial Details", type: "text", required: true, placeholder: "PHP xx/sqm" },
  { key: "rentPercentDiff", label: "Rent % Diff (Below/Above Benchmark)", section: "Financial Details", type: "text", required: true, placeholder: "x% (Below/Above Benchmark)" },
  { key: "escalationYears", label: "Escalation Years", section: "Financial Details", type: "text", required: true, placeholder: "x years" },
  { key: "escalationRate", label: "Escalation Rate (%)", section: "Financial Details", type: "text", required: true, placeholder: "xx.xx%" },
  { key: "cpoBenchmark", label: "CPO Benchmark", section: "Financial Details", type: "text", required: true, placeholder: "$x.xxx" },
  { key: "cpoActual", label: "CPO Actual", section: "Financial Details", type: "text", required: true, placeholder: "$x.xxx" },
  { key: "cpoPercentDiff", label: "CPO % Diff (Below/Above Budget)", section: "Financial Details", type: "text", required: true, placeholder: "xx.xx% (Below/Above Budget)" },
  { key: "securityDeposit", label: "Security Deposit", section: "Financial Details", type: "text", required: true, placeholder: "x months of rent; PHP xxx,xxx.xx. No SecDep if under Subleasing." },
  { key: "renovation", label: "Renovation", section: "Financial Details", type: "select", required: true, options: ["Required-SPX to shoulder", "Required-Lessor/Sublessor to shoulder", "Not Required"] },
  { key: "renovationType", label: "Renovation Type", section: "Financial Details", type: "select", required: true, options: ["Major Works (Standard SPX Renov+Parking/Structural/Power Upgrade)", "Medium Works (Standard SPX Renov)", "Minor Works (Additional Lighting and Power, Standard safety requirements)"] },
  { key: "cpoBudgetStatus", label: "CPO Budget Status", section: "Financial Details", type: "select", required: true },
  { key: "otherConcerns", label: "Other Concerns", section: "Other Details", type: "textarea", required: true }
];

export const REQUIRED_DOCUMENT_TYPES = [
  "FF Approval",
  "CPO Table",
  "Hub Location Scoring"
] as const;

export const OPTIONAL_DOCUMENT_TYPES = [
  "Optional file 1",
  "Optional file 2",
  "Optional file 3"
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  ...REQUIRED_DOCUMENT_TYPES,
  ...OPTIONAL_DOCUMENT_TYPES
] as const;

export function emptyForm(): HODApprovalFormData {
  return {
    title: "",
    requestType: "",
    businessJustification: "",
    expectedOutcome: "",
    operationalImpact: "",
    requiredDate: "",
    targetCompletionDate: "",
    estimatedAmount: "",
    currency: "PHP",
    costCenter: "",
    hubId: "",
    location: "",
    facility: "",
    hubName: "",
    region: "",
    pipeline: "",
    facilityType: "",
    expansionType: "",
    existingHubPreSplit: "",
    existingHubPostSplit: "",
    proposedSitePre: "",
    proposedSitePost: "",
    businessPermit: "",
    occupancyPermit: "",
    taxDeclaration: "",
    zoningClearance: "",
    tct: "",
    siteName: "",
    state: "",
    city: "",
    district: "",
    completeAddress: "",
    coordinates: "",
    expansionsPIC: "",
    areaManager: "",
    leaseType: "",
    subleaseMarkupPercent: "",
    reasonForSubleasing: "",
    facilityWork: "",
    locationScore: "",
    dueDiligenceStatus: "",
    rentBenchmarkEscalation: "",
    cpoBenchmark: "",
    rentActual: "",
    rentPercentDiff: "",
    escalationYears: "",
    escalationRate: "",
    securityDeposit: "",
    rentBenchmark: "",
    rentEscalation: "",
    cpoActual: "",
    cpoPercentDiff: "",
    renovation: "",
    renovationType: "",
    otherConcerns: "",
    adoTotal: "",
    lastMile: "",
    firstMile: "",
    totalLeasedAreaSize: "",
    indoorSize: "",
    outdoorSize: "",
    utilization: "",
    monthlyRentVatExclusive: "",
    renovationEstimate: "",
    renovationDepreciation: "",
    totalMonthlyCost: "",
    cpoRentRenovation: "",
    cpoRent: "",
    cpoRenov: "",
    lessorSublessor: "",
    contractTermMonths: "",
    yearlyEscalationRate: "",
    advanceRentPhp: "",
    securityDepositPhp: "",
    utilityDepositPhp: "",
    cpoBudgetStatus: "",
    watcherEmails: [],
    notes: ""
  };
}

export function formFromRow(data: Record<string, unknown>): HODApprovalFormData {
  const base = emptyForm();
  for (const key of Object.keys(base) as Array<keyof HODApprovalFormData>) {
    const value = data[key];
    if (key === "cpoBudgetStatus") {
      if (value === "WITHIN_CPO_BUDGET" || value === "ABOVE_CPO_BUDGET") {
        base.cpoBudgetStatus = value;
      }
    } else if (key === "watcherEmails" && Array.isArray(value)) {
      base[key] = value.map(String);
    } else if (typeof value === "string") {
      (base as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return base;
}
