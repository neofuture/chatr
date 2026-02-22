-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "replyToContent" TEXT,
ADD COLUMN     "replyToId" TEXT,
ADD COLUMN     "replyToSenderName" TEXT;
