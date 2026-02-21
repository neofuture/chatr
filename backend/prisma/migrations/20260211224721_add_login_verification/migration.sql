-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loginVerificationCode" TEXT,
ADD COLUMN     "loginVerificationExpiry" TIMESTAMP(3);
