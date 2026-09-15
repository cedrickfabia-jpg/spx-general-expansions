export interface WorkflowAccessType {
  id: string;
  label: string;
}

export interface WorkflowNavItem {
  href: string;
  label: string;
  adminOnly?: boolean;
  watcherOnly?: boolean;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  href: string;
  description: string;
  pathPrefixes: string[];
  navItems: WorkflowNavItem[];
  accessTypes: WorkflowAccessType[];
}

export const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: "hod-approval",
    name: "HOD Approval",
    href: "/workflows/hod-approval",
    description: "HOD Approval Workflow V1",
    pathPrefixes: ["/workflows/hod-approval", "/approvals"],
    navItems: [
      { href: "/approvals/my-requests", label: "My Requests" },
      { href: "/approvals/my-approvals", label: "My Approvals" },
      { href: "/approvals/my-watches", label: "My Watches", watcherOnly: true },
      { href: "/approvals/all", label: "All Requests", adminOnly: true },
      { href: "/notifications", label: "Notifications" }
    ],
    accessTypes: [
      { id: "ADMINISTRATOR", label: "Administrator view" },
      { id: "REQUESTER", label: "Requester view" },
      { id: "HOD_1", label: "HOD 1" },
      { id: "HOD_2", label: "HOD 2" }
    ]
  }
];

export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return WORKFLOWS.find((workflow) => workflow.id === id);
}

export function getWorkflowByPath(pathname: string): WorkflowDefinition | undefined {
  return WORKFLOWS.find((workflow) =>
    workflow.pathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
  );
}

export function getWorkflowAccessType(workflowId: string, accessType: string): WorkflowAccessType | undefined {
  return getWorkflow(workflowId)?.accessTypes.find((item) => item.id === accessType);
}

export const HOD_APPROVAL_WORKFLOW_ID = "hod-approval";
