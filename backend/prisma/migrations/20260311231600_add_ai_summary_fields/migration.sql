-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "summary" TEXT,
ADD COLUMN     "summaryGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "summaryMessageCount" INTEGER;

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "summary" TEXT,
ADD COLUMN     "summaryGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "summaryMessageCount" INTEGER;
