ALTER TABLE "scans" ADD COLUMN "review_language" VARCHAR(2) NOT NULL DEFAULT 'ru';

CREATE INDEX "scans_review_language_idx" ON "scans"("review_language");
