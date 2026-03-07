-- CreateTable
CREATE TABLE "profile_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "showCatalog" BOOLEAN NOT NULL DEFAULT true,
    "showServices" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_settings_userId_key" ON "profile_settings"("userId");

-- RenameForeignKey
ALTER TABLE "appointments" RENAME CONSTRAINT "appointments_restaurantId_fkey" TO "appointments_commerceId_fkey";

-- RenameForeignKey
ALTER TABLE "branches" RENAME CONSTRAINT "branches_restaurantId_fkey" TO "branches_commerceId_fkey";

-- RenameForeignKey
ALTER TABLE "categories" RENAME CONSTRAINT "categories_restaurantId_fkey" TO "categories_commerceId_fkey";

-- RenameForeignKey
ALTER TABLE "customers" RENAME CONSTRAINT "customers_restaurantId_fkey" TO "customers_commerceId_fkey";

-- RenameForeignKey
ALTER TABLE "deliveries" RENAME CONSTRAINT "deliveries_restaurantId_fkey" TO "deliveries_commerceId_fkey";

-- RenameForeignKey
ALTER TABLE "drivers" RENAME CONSTRAINT "drivers_restaurantId_fkey" TO "drivers_commerceId_fkey";

-- RenameForeignKey
ALTER TABLE "employees" RENAME CONSTRAINT "employees_restaurantId_fkey" TO "employees_commerceId_fkey";

-- RenameForeignKey
ALTER TABLE "expense_categories" RENAME CONSTRAINT "expense_categories_restaurantId_fkey" TO "expense_categories_commerceId_fkey";

-- RenameForeignKey
ALTER TABLE "expenses" RENAME CONSTRAINT "expenses_restaurantId_fkey" TO "expenses_commerceId_fkey";

-- RenameForeignKey
ALTER TABLE "notifications" RENAME CONSTRAINT "notifications_restaurantId_fkey" TO "notifications_commerceId_fkey";

-- RenameForeignKey
ALTER TABLE "orders" RENAME CONSTRAINT "orders_restaurantId_fkey" TO "orders_commerceId_fkey";

-- RenameForeignKey
ALTER TABLE "products" RENAME CONSTRAINT "products_restaurantId_fkey" TO "products_commerceId_fkey";

-- RenameForeignKey
ALTER TABLE "restaurant_settings" RENAME CONSTRAINT "restaurant_settings_restaurantId_fkey" TO "restaurant_settings_commerceId_fkey";

-- AddForeignKey
ALTER TABLE "profile_settings" ADD CONSTRAINT "profile_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "branches_name_restaurantId_key" RENAME TO "branches_name_commerceId_key";

-- RenameIndex
ALTER INDEX "catalog_orders_restaurantId_idx" RENAME TO "catalog_orders_commerceId_idx";

-- RenameIndex
ALTER INDEX "categories_name_restaurantId_key" RENAME TO "categories_name_commerceId_key";

-- RenameIndex
ALTER INDEX "customers_email_restaurantId_key" RENAME TO "customers_email_commerceId_key";

-- RenameIndex
ALTER INDEX "employees_email_restaurantId_key" RENAME TO "employees_email_commerceId_key";

-- RenameIndex
ALTER INDEX "expense_categories_name_restaurantId_key" RENAME TO "expense_categories_name_commerceId_key";

-- RenameIndex
ALTER INDEX "notifications_restaurantId_createdAt_idx" RENAME TO "notifications_commerceId_createdAt_idx";

-- RenameIndex
ALTER INDEX "notifications_restaurantId_read_idx" RENAME TO "notifications_commerceId_read_idx";

-- RenameIndex
ALTER INDEX "restaurant_settings_restaurantId_key" RENAME TO "restaurant_settings_commerceId_key";
