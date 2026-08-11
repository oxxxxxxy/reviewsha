ALTER TABLE "chat_messages"
ADD COLUMN "idempotency_key" VARCHAR(128);

CREATE UNIQUE INDEX "chat_messages_session_id_user_id_idempotency_key_key"
ON "chat_messages" ("session_id", "user_id", "idempotency_key");
