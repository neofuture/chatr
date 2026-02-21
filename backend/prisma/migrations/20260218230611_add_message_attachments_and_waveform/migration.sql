-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "duration" DOUBLE PRECISION,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "waveformData" TEXT;
