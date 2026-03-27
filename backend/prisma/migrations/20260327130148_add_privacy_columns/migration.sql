-- AlterTable: Replace old show* columns with new privacy* columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyOnlineStatus" TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyPhone" TEXT NOT NULL DEFAULT 'nobody';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyEmail" TEXT NOT NULL DEFAULT 'nobody';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyFullName" TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyGender" TEXT NOT NULL DEFAULT 'nobody';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "privacyJoinedDate" TEXT NOT NULL DEFAULT 'everyone';

-- Drop old columns if they exist
ALTER TABLE "User" DROP COLUMN IF EXISTS "showOnlineStatus";
ALTER TABLE "User" DROP COLUMN IF EXISTS "showPhoneNumber";
ALTER TABLE "User" DROP COLUMN IF EXISTS "showEmail";
