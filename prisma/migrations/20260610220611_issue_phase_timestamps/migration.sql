-- AlterTable
ALTER TABLE "issue" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedAt" TIMESTAMP(3);
