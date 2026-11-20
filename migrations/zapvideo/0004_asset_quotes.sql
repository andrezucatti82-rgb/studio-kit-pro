CREATE TABLE asset_quotes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  parameters TEXT NOT NULL,
  reserved_micros INTEGER NOT NULL CHECK(reserved_micros>=0),
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (project_id,revision) REFERENCES revisions(project_id,revision)
);
CREATE INDEX asset_quotes_expiry ON asset_quotes(expires_at);
