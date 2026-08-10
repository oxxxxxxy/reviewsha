CREATE TABLE "admin_logs" (
    "id" UUID NOT NULL,
    "level" VARCHAR(16) NOT NULL,
    "service" VARCHAR(80) NOT NULL,
    "context" VARCHAR(120),
    "message" TEXT NOT NULL,
    "request_id" VARCHAR(120),
    "trace_id" VARCHAR(120),
    "metadata" JSONB,
    "stack" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_logs_level_idx" ON "admin_logs"("level");
CREATE INDEX "admin_logs_service_idx" ON "admin_logs"("service");
CREATE INDEX "admin_logs_created_at_idx" ON "admin_logs"("created_at");
