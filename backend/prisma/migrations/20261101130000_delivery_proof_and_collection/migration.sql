-- CreateEnum
CREATE TYPE "DeliveryCollection" AS ENUM ('CASH', 'TRANSFER', 'PREPAID');

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "amountCollected" DECIMAL(20,2),
ADD COLUMN     "collectedMethod" "DeliveryCollection",
ADD COLUMN     "deliveryCode" TEXT,
ADD COLUMN     "failureReason" TEXT;

