-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "subcategoryId" TEXT;

-- CreateIndex
CREATE INDEX "user_profiles_categoryId_idx" ON "user_profiles"("categoryId");

-- CreateIndex
CREATE INDEX "user_profiles_subcategoryId_idx" ON "user_profiles"("subcategoryId");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "user_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "user_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

