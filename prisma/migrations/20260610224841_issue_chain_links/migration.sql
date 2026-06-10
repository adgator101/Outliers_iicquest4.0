-- AlterTable
ALTER TABLE "issue" ADD COLUMN     "chainRootIssueId" TEXT;

-- CreateTable
CREATE TABLE "issue_chain_link" (
    "id" TEXT NOT NULL,
    "upstreamIssueId" TEXT NOT NULL,
    "downstreamIssueId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,

    CONSTRAINT "issue_chain_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "issue_chain_link_upstreamIssueId_downstreamIssueId_key" ON "issue_chain_link"("upstreamIssueId", "downstreamIssueId");

-- AddForeignKey
ALTER TABLE "issue_chain_link" ADD CONSTRAINT "issue_chain_link_upstreamIssueId_fkey" FOREIGN KEY ("upstreamIssueId") REFERENCES "issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_chain_link" ADD CONSTRAINT "issue_chain_link_downstreamIssueId_fkey" FOREIGN KEY ("downstreamIssueId") REFERENCES "issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
