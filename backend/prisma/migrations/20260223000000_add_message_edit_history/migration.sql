-- Migration: add_message_edit_history
-- Adds edited/editedAt fields to Message and a full audit-log table (MessageEditHistory)
-- The history table is append-only and never deleted — required for legal retention.

-- 1. Add edit tracking columns to Message
ALTER TABLE "Message" ADD COLUMN "edited"   BOOLEAN   NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3);

-- 2. Create immutable edit-history audit log
CREATE TABLE "MessageEditHistory" (
    "id"              TEXT        NOT NULL,
    "messageId"       TEXT        NOT NULL,
    "editedById"      TEXT        NOT NULL,
    "previousContent" TEXT        NOT NULL,
    "editedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageEditHistory_pkey" PRIMARY KEY ("id")
);

-- 3. Foreign keys
ALTER TABLE "MessageEditHistory"
    ADD CONSTRAINT "MessageEditHistory_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageEditHistory"
    ADD CONSTRAINT "MessageEditHistory_editedById_fkey"
    FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Indexes for fast look-up
CREATE INDEX "MessageEditHistory_messageId_idx" ON "MessageEditHistory"("messageId");
CREATE INDEX "MessageEditHistory_editedById_idx" ON "MessageEditHistory"("editedById");

