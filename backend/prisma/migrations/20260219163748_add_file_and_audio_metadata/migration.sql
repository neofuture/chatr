/*
  Warnings:

  - You are about to drop the column `conversationId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `waveformData` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the `Conversation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConversationParticipant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_userId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_conversationId_fkey";

-- DropIndex
DROP INDEX "Message_conversationId_idx";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "conversationId",
DROP COLUMN "duration",
DROP COLUMN "waveformData",
ADD COLUMN     "audioDuration" DOUBLE PRECISION,
ADD COLUMN     "audioWaveform" JSONB;

-- DropTable
DROP TABLE "Conversation";

-- DropTable
DROP TABLE "ConversationParticipant";
