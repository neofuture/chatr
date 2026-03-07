-- Add status and invitedBy to GroupMember
-- Backfill existing rows to 'accepted' BEFORE adding the default so they aren't reset to 'pending'
ALTER TABLE "GroupMember" ADD COLUMN IF NOT EXISTS "invitedBy" TEXT;
ALTER TABLE "GroupMember" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'accepted';
-- New rows created after this migration will default to 'pending' — change the default
ALTER TABLE "GroupMember" ALTER COLUMN "status" SET DEFAULT 'pending';
