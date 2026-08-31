-- CreateEnum
CREATE TYPE "ReputationEntityType" AS ENUM ('COMMERCE', 'PROFESSIONAL', 'DRIVER');

-- CreateTable
CREATE TABLE "reputation_scores" (
    "id" TEXT NOT NULL,
    "entityType" "ReputationEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reputation_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reputation_scores_entityType_score_idx" ON "reputation_scores"("entityType", "score");

-- CreateIndex
CREATE UNIQUE INDEX "reputation_scores_entityType_entityId_key" ON "reputation_scores"("entityType", "entityId");

