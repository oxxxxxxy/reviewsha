-- Reconcile legacy development databases whose ai_usage table predates the
-- scan-based usage model.
ALTER TABLE "ai_usage"
  ADD COLUMN IF NOT EXISTS "scan_id" UUID,
  ADD COLUMN IF NOT EXISTS "tokens_used" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ai_usage" ALTER COLUMN "scan_id" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ai_usage_scan_id_model_key" ON "ai_usage"("scan_id", "model");
