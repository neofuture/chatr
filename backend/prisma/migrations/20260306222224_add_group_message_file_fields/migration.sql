-- AlterTable
ALTER TABLE "GroupMessage" ADD COLUMN     "audioDuration" DOUBLE PRECISION,
ADD COLUMN     "audioWaveform" JSONB,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "fileUrl" TEXT;
