-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PipelineStep" AS ENUM ('EXTRACT', 'PARSE', 'ANALYZE', 'MERGE', 'REPORT', 'NOTIFY');

-- AlterTable
ALTER TABLE "scans" ADD COLUMN     "pipeline_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pipeline_error_at" TIMESTAMPTZ(3),
ADD COLUMN     "pipeline_error_code" VARCHAR(120),
ADD COLUMN     "pipeline_error_message" TEXT,
ADD COLUMN     "pipeline_error_stack" TEXT,
ADD COLUMN     "pipeline_finished_at" TIMESTAMPTZ(3),
ADD COLUMN     "pipeline_started_at" TIMESTAMPTZ(3),
ADD COLUMN     "pipeline_status" "PipelineStatus",
ADD COLUMN     "pipeline_step" "PipelineStep";
