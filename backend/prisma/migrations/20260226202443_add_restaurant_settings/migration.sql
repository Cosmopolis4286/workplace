-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "email" TEXT,
ADD COLUMN     "schedule" TEXT;

-- CreateTable
CREATE TABLE "restaurant_settings" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 16,
    "suggestedTip" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "paymentMethods" TEXT[] DEFAULT ARRAY['cash', 'card', 'transfer']::TEXT[],
    "avgPrepTime" INTEGER NOT NULL DEFAULT 20,
    "avgDeliveryTime" INTEGER NOT NULL DEFAULT 30,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "freeDeliveryMinimum" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "notifyNewOrders" BOOLEAN NOT NULL DEFAULT true,
    "notifyLowStock" BOOLEAN NOT NULL DEFAULT true,
    "notifyDailyReports" BOOLEAN NOT NULL DEFAULT false,
    "notifyCustomerReviews" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_settings_restaurantId_key" ON "restaurant_settings"("restaurantId");

-- AddForeignKey
ALTER TABLE "restaurant_settings" ADD CONSTRAINT "restaurant_settings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
