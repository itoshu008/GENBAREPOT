-- Add job-specific columns to sites table
USE genbareport_db;

ALTER TABLE sites
  ADD COLUMN job_id VARCHAR(100) DEFAULT NULL AFTER id,
  ADD COLUMN staff_name VARCHAR(255) DEFAULT NULL AFTER site_name,
  ADD UNIQUE KEY uniq_job (job_id),
  ADD KEY idx_staff_name (staff_name);


