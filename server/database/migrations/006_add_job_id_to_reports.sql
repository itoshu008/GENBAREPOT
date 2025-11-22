-- Add job_id column to reports table
USE genbareport_db;

ALTER TABLE reports
  ADD COLUMN job_id VARCHAR(100) DEFAULT NULL AFTER id,
  ADD KEY idx_job_id (job_id);


