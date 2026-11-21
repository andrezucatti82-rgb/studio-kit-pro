CREATE TABLE delivery_links (
  token TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (job_id, file_id)
);
