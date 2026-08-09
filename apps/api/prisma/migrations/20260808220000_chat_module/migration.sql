UPDATE "chat_sessions" SET "title" = 'New Chat' WHERE "title" IS NULL;

ALTER TABLE "chat_sessions"
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "title" SET DEFAULT 'New Chat';

ALTER TABLE "chat_messages"
ADD COLUMN "tokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "request_id" UUID;

CREATE UNIQUE INDEX "chat_messages_request_id_key" ON "chat_messages"("request_id");
CREATE INDEX "chat_messages_request_id_idx" ON "chat_messages"("request_id");
