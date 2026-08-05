-- CreateEnum
CREATE TYPE "ProjectHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'ARCHIVED', 'RESTORED', 'DELETED', 'TAG_ADDED', 'TAG_REMOVED');

-- CreateTable
CREATE TABLE "project_tags" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_history" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" "ProjectHistoryAction" NOT NULL,
    "changed_fields" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_tags_name_idx" ON "project_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "project_tags_project_id_name_key" ON "project_tags"("project_id", "name");

-- CreateIndex
CREATE INDEX "project_history_project_id_created_at_idx" ON "project_history"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "project_history_actor_id_idx" ON "project_history"("actor_id");

-- CreateIndex
CREATE INDEX "project_history_action_idx" ON "project_history"("action");

-- AddForeignKey
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_history" ADD CONSTRAINT "project_history_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_history" ADD CONSTRAINT "project_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
