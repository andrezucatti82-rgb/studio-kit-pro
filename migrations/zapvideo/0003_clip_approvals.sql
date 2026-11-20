CREATE TABLE clip_visual_approvals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  owner TEXT NOT NULL REFERENCES people(id),
  scene_id TEXT NOT NULL,
  shot_id TEXT NOT NULL,
  frame_id TEXT NOT NULL,
  frame_upload TEXT NOT NULL,
  frame_sha256 TEXT NOT NULL,
  aspect TEXT NOT NULL CHECK(aspect IN ('9:16','16:9')),
  basis_sha256 TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('mock','gemini')),
  model TEXT NOT NULL,
  message TEXT NOT NULL,
  decided_at INTEGER NOT NULL,
  FOREIGN KEY (project_id,revision) REFERENCES revisions(project_id,revision)
);
CREATE INDEX clip_approvals_scope ON clip_visual_approvals(project_id,owner,scene_id,shot_id);
CREATE TABLE clip_quotes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  approval_id TEXT NOT NULL REFERENCES clip_visual_approvals(id),
  reserved_micros INTEGER NOT NULL CHECK(reserved_micros>=0),
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (project_id,revision) REFERENCES revisions(project_id,revision)
);
CREATE INDEX clip_quotes_expiry ON clip_quotes(expires_at);
ALTER TABLE jobs ADD COLUMN provider_file_id TEXT;
ALTER TABLE jobs ADD COLUMN provider_claim_at INTEGER;
