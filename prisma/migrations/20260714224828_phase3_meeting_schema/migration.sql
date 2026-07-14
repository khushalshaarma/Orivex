-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'STARTING', 'LIVE', 'ENDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "meetingCode" TEXT,
ADD COLUMN     "meetingLink" TEXT,
ADD COLUMN     "meetingProvider" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "MeetingMember" ADD COLUMN     "joinedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Meeting_status_idx" ON "Meeting"("status");
