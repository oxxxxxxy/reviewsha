ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "source_type" VARCHAR(20) NOT NULL DEFAULT 'UPLOAD';
ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "source_commit" VARCHAR(255);
ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "source_repo" VARCHAR(255);
CREATE INDEX IF NOT EXISTS "uploaded_files_project_id_source_commit_idx" ON "uploaded_files"("project_id", "source_commit");
