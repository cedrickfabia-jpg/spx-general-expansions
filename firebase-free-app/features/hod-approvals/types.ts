export type CpoBudgetStatus = "WITHIN_CPO_BUDGET" | "ABOVE_CPO_BUDGET";

export type RequestStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "QUESTION_RAISED"
  | "REJECTED"
  | "APPROVED"
  | "CANCELLED";

export type ApprovalStepStatus = "PENDING" | "ACTIVE" | "APPROVED" | "REJECTED" | "CANCELLED";

export type RoleName = "REQUESTER" | "HOD_APPROVER" | "WATCHER" | "ADMINISTRATOR";

export interface UserName {
  id: string;
  name: string;
  email: string;
}

export interface AppUser {
  id: string;
  googleId: string | null;
  email: string;
  name: string;
  profilePicture: string | null;
  active: boolean;
  roles: RoleName[];
  isAdmin: boolean;
  workflowAccess?: Record<string, string[]>;
}

export interface Hub {
  id: string;
  name: string;
  code: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApproverRoute {
  id: string;
  workflowId: string;
  hubId: string;
  slot: 1 | 2;
  approverUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowApprover {
  workflowId: string;
  slot: 1 | 2;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowAccess {
  workflowId: string;
  userId: string;
  accessType: string;
  grantedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HODApprovalFormData {
  title: string;
  requestType: string;
  businessJustification: string;
  expectedOutcome: string;
  operationalImpact: string;
  requiredDate: string;
  targetCompletionDate: string;
  estimatedAmount: string;
  currency: string;
  costCenter: string;
  hubId: string;
  location: string;
  facility: string;
  hubName: string;
  region: string;
  pipeline: string;
  facilityType: string;
  expansionType: string;
  existingHubPreSplit: string;
  existingHubPostSplit: string;
  proposedSitePre: string;
  proposedSitePost: string;
  businessPermit: string;
  occupancyPermit: string;
  taxDeclaration: string;
  zoningClearance: string;
  tct: string;
  siteName: string;
  state: string;
  city: string;
  district: string;
  completeAddress: string;
  coordinates: string;
  expansionsPIC: string;
  areaManager: string;
  leaseType: string;
  subleaseMarkupPercent: string;
  reasonForSubleasing: string;
  facilityWork: string;
  locationScore: string;
  dueDiligenceStatus: string;
  rentBenchmarkEscalation: string;
  rentBenchmark: string;
  rentActual: string;
  rentPercentDiff: string;
  rentEscalation: string;
  escalationYears: string;
  escalationRate: string;
  cpoBenchmark: string;
  cpoActual: string;
  cpoPercentDiff: string;
  securityDeposit: string;
  renovation: string;
  renovationType: string;
  otherConcerns: string;
  adoTotal: string;
  lastMile: string;
  firstMile: string;
  totalLeasedAreaSize: string;
  indoorSize: string;
  outdoorSize: string;
  utilization: string;
  monthlyRentVatExclusive: string;
  renovationEstimate: string;
  renovationDepreciation: string;
  totalMonthlyCost: string;
  cpoRentRenovation: string;
  cpoRent: string;
  cpoRenov: string;
  lessorSublessor: string;
  contractTermMonths: string;
  yearlyEscalationRate: string;
  advanceRentPhp: string;
  securityDepositPhp: string;
  utilityDepositPhp: string;
  cpoBudgetStatus: CpoBudgetStatus | "";
  watcherEmails: string[];
  notes: string;
}

export interface ApprovalRequestRow {
  id: string;
  requestNumber: string | null;
  requesterId: string;
  hubId: string;
  title: string;
  cpoBudgetStatus: CpoBudgetStatus;
  requiredApproverCount: number | null;
  status: RequestStatus;
  currentRevisionId: string | null;
  parentRequestId: string | null;
  routingJson: string | null;
  dataJson: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
}

export interface ApprovalStepRow {
  id: string;
  approvalRequestId: string;
  sequence: number;
  approverId: string;
  originalApproverId: string;
  status: ApprovalStepStatus;
  activatedAt: string | null;
  completedAt: string | null;
}

export interface RequestRevisionRow {
  id: string;
  approvalRequestId: string;
  versionNumber: number;
  createdBy: string;
  reason: string;
  dataJson: string;
  createdAt: string;
}

export interface ApprovalActionRow {
  id: string;
  approvalRequestId: string;
  approvalStepId: string | null;
  actorId: string;
  action: string;
  comment: string | null;
  requestRevisionId: string | null;
  createdAt: string;
}

export interface ApprovalCommentRow {
  id: string;
  approvalRequestId: string;
  approvalStepId: string | null;
  authorId: string;
  type: "QUESTION" | "RESPONSE" | "NOTE";
  message: string;
  requestRevisionId: string | null;
  createdAt: string;
}

export interface DocumentRow {
  id: string;
  approvalRequestId: string;
  documentName: string;
  documentType: string;
  createdBy: string;
  createdAt: string;
}

export interface DocumentVersionRow {
  id: string;
  documentId: string;
  versionNumber: number;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  deliveryStatus: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
  emailSubject: string | null;
  emailBody: string | null;
  emailAttempts: number;
  createdAt: string;
}

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadataJson: string | null;
  createdAt: string;
}

export interface RoutingDecision {
  requiredApproverCount: number;
  approvers: Array<{ slot: 1 | 2; originalApproverId: string; approverId: string }>;
  determinedAt: string;
}

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
