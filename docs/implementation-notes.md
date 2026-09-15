# Implementation Notes

## Database

The local runtime uses Node's built-in `node:sqlite` (`DatabaseSync`). Tables are
created idempotently from `lib/schema.ts`. The schema follows the entities required
by the master prompt: users, roles, hubs, approver_routes,
workflow_approvers, workflow_access, approval_requests, approval_steps, approval_actions,
approval_watchers, approval_comments, request_revisions, documents,
document_versions, notifications, email_logs, audit_logs, sequence_counters, and
app_settings.

Timestamps are stored as UTC ISO strings and converted to Asia/Manila for display.

## Workflow Engine

`features/hod-approvals/workflow.ts` implements the domain workflow service:

- `createDraft`, `updateDraft`, `cancelDraft`
- `submitRequest`, `approveStep`, `rejectStep`, `askQuestion`
- `respondToQuestion`, `withdrawRequest`
- `uploadDocumentVersion`, `replaceApprover`
- `previewApprovalRoute`

All state transitions run inside `BEGIN IMMEDIATE` transactions, so conflicting
actions (double approval, HOD 2 acting before HOD 1, approval after rejection or
withdrawal) are rejected server-side.

## Routing

Each hub has a configurable HOD Approver 1 and HOD Approver 2. At submission the
routing decision is recorded on the request. When a step is activated, the service
uses the workflow-level HOD 1 / HOD 2 assignment. Completed steps are never
rewritten.

## Request Numbers

Request numbers use the `APR-YYYY-NNNNNN` format and are allocated from a database
sequence inside the submission transaction.

## Authentication

Google OAuth is implemented through `/api/auth/start` and `/api/auth/callback`.
The callback validates the email domain server-side before creating a session.
When Google credentials are not configured, `AUTH_DEV_MODE` enables demo logins
that still go through the same domain validation.

## Email and Notifications

Notifications are written to the database first. Email delivery is attempted
asynchronously and failures are recorded on the notification row. A failed email
never rolls back an approval action. The retry script resends failed
notifications.

Approvers receive an email reminder when a request has been waiting for approval
for 24 hours, and the reminder repeats daily until the request is actioned or
escalated. The reminder and escalation windows are configurable in
Administration > Notifications.

## Documents

Files are stored privately under `data/storage` in development. Every upload
creates a new document version; existing versions are never overwritten.
Download routes require an authenticated user who can view the parent request.

## Official Template

The requester form is limited to the fields provided by the user: Hub Name,
Region (uppercase), and the 16 request details in `docs/template-mapping.md`.
Sublease Mark-Up % and Reason for Subleasing are optional. Uploads are limited to
the three required document types (FF Approval, CPO Table, Hub Location Scoring)
plus three optional types (Optional file 1, Optional file 2, Optional file 3).
Only PDF files are accepted. Submission is blocked until all required uploads
exist.

The CPO Budget Status is kept internal. It is derived from the CPO field text:
"Above Budget" routes to two HOD approvers, otherwise one HOD approver is used.

## Administration

`cedrick.fabia@spxexpress.com` is always granted the administrator role on login.
Any other `@spxexpress.com` email can log in and automatically receives Watcher
access. Administrators can grant access from the Users & Roles page with one of
the workflow's access types, such as Administrator, Requester, HOD 1, or HOD 2
for the HOD Approval workflow. Access is segmented per workflow through the
`workflow_access` table, so future workflows can define their own access types.
HOD approvers are also assigned through the HOD Approver Routing module, which
grants the HOD approver role automatically. The granted access is enforced
server-side through role assignment.
When access is granted through Users & Roles, or when a user is assigned as
HOD 1 / HOD 2 in the routing module, the user receives an email notification
and an in-app notification.

Approval routing uses two slots: HOD 1 and HOD 2. Within-budget requests route
to HOD 1 only. Above-budget requests route to HOD 1 first, then HOD 2 after HOD 1
approves.

## History and Reporting

Administrators can download the full HOD approval history as a CSV file from the
Administration page. Each row includes the request, requester, hub, status, and
the approved date for HOD Approver 1 and HOD Approver 2 separately, plus the
rejected date and rejecting approver. The dashboard recent requests table also
shows these dates. The export supports an optional From/To date range that
filters by request creation date, and the All Requests page supports bulk CSV
export of selected requests. Advanced admin filters include created date range,
approver email, watcher email, and status.

The audit log page supports search, action, and date filters, and can export the
filtered audit log as CSV.

Request detail pages include an Add Comment section. Comments are stored as
`NOTE` type records and do not pause the approval workflow.

Non-admin participants receive in-app notifications at each workflow stage,
including intermediate approval steps, questions, and responses. Watchers can
stop watching a request themselves and can set their watcher email frequency to
Immediate or Off from the Profile page.

Approved requests include a downloadable HOD Approval PDF generated server-side.
The PDF includes the request, requester, request details, approval history with
each HOD approver's completed date, watchers, and an APPROVED confirmation.
Downloads are limited to users who can view the request.

## Watchers

Requesters add watcher emails in the request form. Watcher emails are validated
against the organizational domain, watcher users are created automatically if
needed, and a `WATCHER_ADDED` email notification is recorded immediately.
Watchers see their synced requests under My Watches and on the dashboard after
logging in.

## Workflows

The sidebar has a Workflows section backed by `lib/workflows.ts`. The current
workflow is HOD Approval, linked from the sidebar to `/workflows/hod-approval`.
Approver routes are scoped per workflow with `workflow_id`, so future workflows
can reuse the same approver assignment module and sidebar registry.

After login the dashboard is a workflow hub: it shows only the
enlarged `Welcome to SPX Expansions workflows` message and no request toolbars
or workflow cards. The top-left hamburger menu opens the workflow picker.
Selecting a workflow opens that workflow's dashboard, where its toolbars such
as My Requests, My Approvals, and My Watches appear. Each workflow definition
carries its own `pathPrefixes` and `navItems` in `lib/workflows.ts` so future
workflows follow the same pattern.
The request form includes a CPO Budget Status dropdown: within budget routes to
HOD 1 only, above budget routes to HOD 1 then HOD 2. Administrators can grant
Administrator, Requester, HOD 1, or HOD 2 access; each HOD slot keeps exactly
one user and all other org emails default to Watcher access.
