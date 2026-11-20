ALTER TABLE jobs ADD COLUMN output_bytes INTEGER NOT NULL DEFAULT 0 CHECK(output_bytes >= 0);
