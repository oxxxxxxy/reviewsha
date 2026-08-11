-- Some development databases were created from the pre-AI-persistence
-- schema while the corresponding migration was already recorded as applied.
-- Keep this migration idempotent so both old and fresh databases converge.
ALTER TABLE "ai_responses"
  ADD COLUMN IF NOT EXISTS "result" JSONB,
  ADD COLUMN IF NOT EXISTS "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "completion_tokens" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_tokens" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "duration_ms" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ai_usage"
  ADD COLUMN IF NOT EXISTS "scan_id" UUID,
  ADD COLUMN IF NOT EXISTS "tokens_used" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- The legacy table is empty in affected development databases. Make the
-- column required after adding it, matching the Prisma model.
ALTER TABLE "ai_usage" ALTER COLUMN "scan_id" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ai_usage_scan_id_model_key" ON "ai_usage"("scan_id", "model");
