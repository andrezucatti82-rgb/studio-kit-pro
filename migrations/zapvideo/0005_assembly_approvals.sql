CREATE TABLE assembly_approvals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  owner TEXT NOT NULL REFERENCES people(id),
  sample_job TEXT NOT NULL,
  sample_sha256 TEXT NOT NULL,
  storyboard_sha256 TEXT NOT NULL,
  animatic_sha256 TEXT NOT NULL,
  basis_sha256 TEXT NOT NULL,
  message TEXT NOT NULL,
  decided_at INTEGER NOT NULL,
  FOREIGN KEY (project_id,revision) REFERENCES revisions(project_id,revision)
);
CREATE INDEX assembly_approvals_project ON assembly_approvals(project_id,owner);
