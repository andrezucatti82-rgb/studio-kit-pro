CREATE TABLE people (
  id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, revoked_at INTEGER
);
CREATE TABLE projects (
  id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES people(id), revision INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX projects_owner ON projects(owner);
CREATE TABLE revisions (
  project_id TEXT NOT NULL REFERENCES projects(id), revision INTEGER NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, revision)
);
CREATE TABLE uploads (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), material_id TEXT NOT NULL, sha256 TEXT NOT NULL,
  kind TEXT NOT NULL, bytes INTEGER NOT NULL, key TEXT NOT NULL UNIQUE, multipart TEXT, state TEXT NOT NULL,
  lock_id TEXT, lock_until INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL,
  UNIQUE(project_id, material_id, sha256)
);
CREATE INDEX uploads_expiry ON uploads(expires_at);
CREATE TABLE upload_parts (
  upload_id TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE, part INTEGER NOT NULL, etag TEXT NOT NULL,
  PRIMARY KEY (upload_id,part)
);
CREATE TABLE jobs (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), revision INTEGER NOT NULL,
  kind TEXT NOT NULL, state TEXT NOT NULL, parameters TEXT NOT NULL, result TEXT, error TEXT,
  currency TEXT NOT NULL DEFAULT 'USD', reserved_micros INTEGER NOT NULL DEFAULT 0 CHECK(reserved_micros >= 0),
  provider_id TEXT, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
  FOREIGN KEY (project_id, revision) REFERENCES revisions(project_id, revision)
);
CREATE INDEX jobs_project ON jobs(project_id, state, kind);
CREATE INDEX jobs_expiry ON jobs(expires_at);
CREATE TABLE approvals (
  project_id TEXT NOT NULL, revision INTEGER NOT NULL, scope TEXT NOT NULL, material_id TEXT NOT NULL,
  sha256 TEXT NOT NULL, owner TEXT NOT NULL REFERENCES people(id), decision TEXT NOT NULL,
  message TEXT NOT NULL, decided_at INTEGER NOT NULL,
  PRIMARY KEY(project_id,revision,scope,material_id),
  FOREIGN KEY(project_id,revision) REFERENCES revisions(project_id,revision)
);
CREATE TABLE grants (
  hash TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES people(id), job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX grants_expiry ON grants(expires_at);
CREATE TABLE handoffs (
  hash TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES people(id), key TEXT NOT NULL UNIQUE, bytes INTEGER NOT NULL,
  ready INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL
);
CREATE INDEX handoffs_expiry ON handoffs(expires_at);
