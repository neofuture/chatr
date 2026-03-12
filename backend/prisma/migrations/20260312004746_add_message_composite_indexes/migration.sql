-- CreateIndex
CREATE INDEX "Message_senderId_recipientId_createdAt_idx" ON "Message"("senderId", "recipientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Message_recipientId_senderId_createdAt_idx" ON "Message"("recipientId", "senderId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Message_recipientId_isRead_deletedAt_idx" ON "Message"("recipientId", "isRead", "deletedAt");
