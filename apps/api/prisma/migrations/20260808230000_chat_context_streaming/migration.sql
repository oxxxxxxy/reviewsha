ALTER TABLE "chat_sessions"
ADD COLUMN "memory" JSONB,
ADD COLUMN "summary" TEXT,
ADD COLUMN "active_topic" VARCHAR(255),
ADD COLUMN "summary_through" TIMESTAMPTZ(3);

CREATE TABLE "chat_usage" (
  "id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "assistant_message_id" UUID NOT NULL,
  "model" VARCHAR(120) NOT NULL,
  "input_tokens" INTEGER NOT NULL DEFAULT 0,
  "output_tokens" INTEGER NOT NULL DEFAULT 0,
  "total_tokens" INTEGER NOT NULL DEFAULT 0,
  "estimated_cost" DECIMAL(14,8) NOT NULL DEFAULT 0,
  "duration_ms" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_usage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_usage_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chat_usage_assistant_message_id_fkey" FOREIGN KEY ("assistant_message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "chat_usage_assistant_message_id_key" ON "chat_usage"("assistant_message_id");
CREATE INDEX "chat_usage_session_id_created_at_idx" ON "chat_usage"("session_id", "created_at");
CREATE INDEX "chat_usage_model_idx" ON "chat_usage"("model");
