-- Legacy development databases stored ai_responses.content as JSONB while
-- the current Prisma model stores the provider response as plain text.
ALTER TABLE "ai_responses"
  ALTER COLUMN "content" TYPE TEXT USING "content"::text;
