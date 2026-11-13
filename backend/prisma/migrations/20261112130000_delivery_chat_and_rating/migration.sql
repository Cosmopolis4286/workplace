-- AlterEnum
ALTER TYPE "ReportEntityType" ADD VALUE 'DELIVERY';

-- AlterEnum
ALTER TYPE "ConversationThreadType" ADD VALUE 'DELIVERY';

-- CreateTable
CREATE TABLE "delivery_ratings" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_ratings_deliveryId_key" ON "delivery_ratings"("deliveryId");

-- CreateIndex
CREATE INDEX "delivery_ratings_driverId_idx" ON "delivery_ratings"("driverId");

-- AddForeignKey
ALTER TABLE "delivery_ratings" ADD CONSTRAINT "delivery_ratings_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

