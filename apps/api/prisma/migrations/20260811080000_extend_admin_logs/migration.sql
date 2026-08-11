ALTER TABLE "admin_logs" ADD COLUMN "event" VARCHAR(160);
ALTER TABLE "admin_logs" ADD COLUMN "user_id" UUID;
ALTER TABLE "admin_logs" ADD COLUMN "project_id" UUID;
ALTER TABLE "admin_logs" ADD COLUMN "job_id" VARCHAR(120);
