CREATE TYPE "ReportStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

ALTER TABLE "reports"
ADD COLUMN "status" "ReportStatus" NOT NULL DEFAULT 'GENERATING';

UPDATE "reports"
SET "status" = CASE WHEN "summary" IS NULL THEN 'GENERATING'::"ReportStatus" ELSE 'READY'::"ReportStatus" END;

CREATE TABLE "report_exports" (
  "id" UUID NOT NULL,
  "report_id" UUID NOT NULL,
  "format" "ReportFormat" NOT NULL,
  "bucket" VARCHAR(80) NOT NULL,
  "object_key" TEXT NOT NULL,
  "mime_type" VARCHAR(160) NOT NULL,
  "size" BIGINT NOT NULL,
  "checksum" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "report_exports_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "report_exports_report_id_format_key" ON "report_exports"("report_id", "format");
CREATE UNIQUE INDEX "report_exports_bucket_object_key_key" ON "report_exports"("bucket", "object_key");
CREATE INDEX "report_exports_report_id_idx" ON "report_exports"("report_id");
