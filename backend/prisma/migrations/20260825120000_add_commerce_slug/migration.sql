-- AlterTable
ALTER TABLE "commerces" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "slugUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "commerces_slug_key" ON "commerces"("slug");

-- CreateIndex
CREATE INDEX "commerces_slug_idx" ON "commerces"("slug");
