ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "github_url" VARCHAR(500);
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "github_branch" VARCHAR(255);
CREATE INDEX IF NOT EXISTS "projects_github_url_idx" ON "projects"("github_url");

ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "source_message" TEXT;
ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "source_committed_at" TIMESTAMPTZ(3);
CREATE INDEX IF NOT EXISTS "uploaded_files_project_id_source_committed_at_idx"
  ON "uploaded_files"("project_id", "source_committed_at");
