-- CreateEnum
CREATE TYPE "RefreshTokenRevokedReason" AS ENUM ('LOGOUT', 'LOGOUT_ALL', 'ROTATION', 'REUSE_DETECTED', 'PASSWORD_CHANGED', 'ADMIN_REVOKED', 'EXPIRED_CLEANUP');

-- AlterTable
ALTER TABLE "refresh_tokens"
  ADD COLUMN "jti" VARCHAR(64),
  ADD COLUMN "user_agent" TEXT,
  ADD COLUMN "ip" VARCHAR(64),
  ADD COLUMN "browser" VARCHAR(120),
  ADD COLUMN "os" VARCHAR(120),
  ADD COLUMN "last_used_at" TIMESTAMPTZ(3),
  ADD COLUMN "last_ip" VARCHAR(64),
  ADD COLUMN "last_user_agent" TEXT,
  ADD COLUMN "revoked_reason" "RefreshTokenRevokedReason";

-- Backfill deterministic JTI values for existing rows before making the column required.
UPDATE "refresh_tokens" SET "jti" = "id"::text WHERE "jti" IS NULL;

-- AlterTable
ALTER TABLE "refresh_tokens" ALTER COLUMN "jti" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "refresh_tokens_revoked_at_idx" ON "refresh_tokens"("revoked_at");
