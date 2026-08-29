-- AlterTable
ALTER TABLE "freelancer_settings" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "slugUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "freelancer_settings_slug_key" ON "freelancer_settings"("slug");

