-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER', 'DELIVERY', 'INVENTORY', 'APPOINTMENT', 'EXPENSE', 'SYSTEM');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "icon" TEXT NOT NULL DEFAULT 'BellIcon',
    "color" TEXT NOT NULL DEFAULT 'gray',
    "link" TEXT,
    "metadata" JSONB,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_restaurantId_createdAt_idx" ON "notifications"("restaurantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_restaurantId_read_idx" ON "notifications"("restaurantId", "read");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
