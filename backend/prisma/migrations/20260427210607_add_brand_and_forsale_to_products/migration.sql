-- AlterTable
ALTER TABLE "products" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "forSale" BOOLEAN NOT NULL DEFAULT true;
