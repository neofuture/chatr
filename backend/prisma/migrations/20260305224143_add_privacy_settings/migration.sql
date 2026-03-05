-- AlterTable
ALTER TABLE "User" ADD COLUMN     "showEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showPhoneNumber" BOOLEAN NOT NULL DEFAULT false;
