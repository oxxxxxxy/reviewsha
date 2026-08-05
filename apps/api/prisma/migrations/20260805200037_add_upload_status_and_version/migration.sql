/*
  Warnings:

  - A unique constraint covering the columns `[project_id,version]` on the table `uploaded_files` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'VALIDATING', 'UPLOADING', 'COMPLETED', 'FAILED', 'DELETED');

-- AlterTable
ALTER TABLE "uploaded_files" ADD COLUMN     "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "uploaded_files_project_id_version_idx" ON "uploaded_files"("project_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "uploaded_files_project_id_version_key" ON "uploaded_files"("project_id", "version");
