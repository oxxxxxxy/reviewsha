ALTER TABLE "ai_requests" ADD COLUMN "chunk_id" VARCHAR(180);
ALTER TABLE "ai_requests" ADD COLUMN "prompt" TEXT;

CREATE TABLE "analysis_contexts" (
  "id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "scan_id" UUID NOT NULL,
  "cache_key" VARCHAR(128) NOT NULL,
  "chunks" JSONB NOT NULL,
  "metadata" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "analysis_contexts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "analysis_contexts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "analysis_contexts_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "analysis_contexts_scan_id_key" ON "analysis_contexts"("scan_id");
CREATE INDEX "analysis_contexts_project_id_idx" ON "analysis_contexts"("project_id");
CREATE INDEX "analysis_contexts_cache_key_idx" ON "analysis_contexts"("cache_key");

CREATE TABLE "ai_responses" (
  "id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "result" JSONB,
  "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
  "completion_tokens" INTEGER NOT NULL DEFAULT 0,
  "total_tokens" INTEGER NOT NULL DEFAULT 0,
  "duration_ms" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_responses_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "ai_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ai_responses_request_id_key" ON "ai_responses"("request_id");

CREATE TABLE "ai_usage" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "project_id" UUID NOT NULL,
  "scan_id" UUID NOT NULL,
  "model" VARCHAR(120) NOT NULL,
  "tokens_used" INTEGER NOT NULL DEFAULT 0,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ai_usage_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_usage_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ai_usage_scan_id_model_key" ON "ai_usage"("scan_id", "model");
CREATE INDEX "ai_usage_user_id_idx" ON "ai_usage"("user_id");
CREATE INDEX "ai_usage_project_id_idx" ON "ai_usage"("project_id");
