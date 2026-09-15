export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  profile_picture TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS hubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approver_routes (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL DEFAULT 'hod-approval',
  hub_id TEXT NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK (slot IN (1,2)),
  approver_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (hub_id, workflow_id, slot)
);

CREATE TABLE IF NOT EXISTS workflow_approvers (
  workflow_id TEXT NOT NULL,
  slot INTEGER NOT NULL CHECK (slot IN (1,2)),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workflow_id, slot)
);

CREATE TABLE IF NOT EXISTS workflow_access (
  workflow_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL,
  granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workflow_id, user_id)
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  request_number TEXT UNIQUE,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  hub_id TEXT NOT NULL REFERENCES hubs(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  cpo_budget_status TEXT NOT NULL CHECK (cpo_budget_status IN ('WITHIN_CPO_BUDGET','ABOVE_CPO_BUDGET')),
  required_approver_count INTEGER,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','PENDING_APPROVAL','QUESTION_RAISED','REJECTED','APPROVED','CANCELLED')),
  current_revision_id TEXT,
  parent_request_id TEXT REFERENCES approval_requests(id) ON DELETE SET NULL,
  routing_json TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  rejection_reason TEXT,
  cancellation_reason TEXT
);

CREATE TABLE IF NOT EXISTS request_revisions (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (approval_request_id, version_number)
);

CREATE TABLE IF NOT EXISTS approval_steps (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  approver_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  original_approver_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('PENDING','ACTIVE','APPROVED','REJECTED','CANCELLED')),
  activated_at TEXT,
  completed_at TEXT,
  UNIQUE (approval_request_id, sequence)
);

CREATE TABLE IF NOT EXISTS approval_actions (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  approval_step_id TEXT REFERENCES approval_steps(id) ON DELETE SET NULL,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  comment TEXT,
  request_revision_id TEXT REFERENCES request_revisions(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approval_watchers (
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (approval_request_id, user_id)
);

CREATE TABLE IF NOT EXISTS approval_comments (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  approval_step_id TEXT REFERENCES approval_steps(id) ON DELETE SET NULL,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('QUESTION','RESPONSE','NOTE')),
  message TEXT NOT NULL,
  request_revision_id TEXT REFERENCES request_revisions(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'SUPPORTING',
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  UNIQUE (document_id, version_number)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  read_at TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (delivery_status IN ('PENDING','SENT','FAILED','SKIPPED')),
  email_subject TEXT,
  email_body TEXT,
  email_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  sent_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sequence_counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL
);
`;
