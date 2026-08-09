ALTER TABLE "projects" ADD COLUMN "last_analysis_at" TIMESTAMPTZ(3);
CREATE INDEX "projects_last_analysis_at_idx" ON "projects"("last_analysis_at");
