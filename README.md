# General Expansions - HOD Approval Workflow V1

A production-style internal web application that replaces the email-based HOD approval
process with a centralized, auditable workflow.

Production portal: https://www.generalexpansions.com

## Scope

Version 1 implements only the HOD Approval Workflow:

- Requester completes the digital HOD Approval form.
- The CPO Budget Status is derived from the CPO field text.
- Within CPO Budget routes to 1 HOD approver.
- Above CPO Budget routes to 2 HOD approvers sequentially.
- HOD Approver 2 can never act before HOD Approver 1 (backend enforced).
- Approvers can approve, reject, or ask questions.
- Questions pause the workflow; responses and revisions are versioned.
- Requests become read-only after submission.
- Documents are private and versioned.
- Approver routing is administrator-managed.
- Every meaningful action is recorded in an immutable audit trail.
- Email is notification only and never the approval record.
- FF Approval, CPO Table, and Hub Location Scoring must be uploaded before a request can be submitted.

The requester form is mapped from the provided HOD Approval sample; see
`docs/template-mapping.md` for the field-by-field mapping.

## Quick Start

```bash
pnpm install --offline --frozen-lockfile --ignore-scripts
pnpm db:init
pnpm db:seed
pnpm dev
```

Open http://localhost:3000.

## Google Workspace Login

The portal signs in through Google Workspace. In production, create an OAuth
client in Google Cloud Console with:

- Authorized redirect URI: `https://www.generalexpansions.com/api/auth/callback`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set in `.env`

Only `firstname.lastname@spxexpress.com` accounts are accepted; the domain check
is enforced server-side on every Google callback.

In local development, `AUTH_DEV_MODE=true` enables demo login buttons on the login
page. Use the seeded fictional accounts:

- `requester.demo@spxexpress.com`
- `hod1.demo@spxexpress.com`
- `hod2.demo@spxexpress.com`
- `watcher.demo@spxexpress.com`
- `admin.demo@spxexpress.com`
- `cedrick.fabia@spxexpress.com` (administrator)

## Commands

```bash
pnpm dev                 # Next.js development server
pnpm build               # Production build
pnpm typecheck           # TypeScript check
pnpm test                # Vitest workflow/auth tests
pnpm db:init             # Initialize the local database
pnpm db:seed             # Seed demo users, hubs, routes, and scenarios
pnpm reminders           # Run reminder/escalation notifications
pnpm retry-notifications # Retry failed notification emails
```

## Architecture

- Next.js App Router with TypeScript.
- Tailwind CSS with a small local UI kit (no third-party component dependency).
- Node built-in SQLite (`node:sqlite`) as the local relational database. The data
  layer is isolated behind repository functions so a PostgreSQL provider can be
  swapped in without touching workflow logic.
- jose-signed HttpOnly session cookies.
- Google OAuth for production, with a server-enforced dev login fallback.
- Local private file storage with a storage-provider interface for S3-compatible
  object storage in production.
- Email provider abstraction: console/file by default, HTTP webhook or SMTP can be
  configured.

## Local Development Fallbacks

Google OAuth, Postgres, S3, and SMTP cannot be fully configured in an offline
environment. The application therefore ships provider seams plus local fallbacks:

- `AUTH_DEV_MODE=true` allows demo logins but every login still passes the
  `@spxexpress.com` domain check server-side.
- `DATABASE_URL=file:./data/app.db` uses SQLite.
- `STORAGE_PROVIDER=local` writes to `data/storage`.
- `EMAIL_PROVIDER=console` writes emails to `data/emails`.

Production deployments should set real credentials from `.env.example` and point
the providers at Google Workspace, PostgreSQL, S3-compatible storage, and an email
provider.

## Security Model

- Domain validation happens server-side.
- Roles are enforced server-side on every route handler and page.
- Workflow state transitions and approval step activation are enforced by the
  domain workflow service inside database transactions.
- Concurrent approvals are serialized by `BEGIN IMMEDIATE` transactions.
- Documents are served through protected download routes after authorization.
- Uploads are validated by size, extension, and MIME type.
- No secrets are committed; see `.env.example`.
