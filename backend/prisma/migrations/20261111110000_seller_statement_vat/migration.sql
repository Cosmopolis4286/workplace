-- AlterTable
ALTER TABLE "seller_statements" ADD COLUMN     "commissionsAmount" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vatAmount" DECIMAL(20,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 0;


-- Estados de cuenta ya emitidos: todo su total era comisión, sin IVA.
UPDATE "seller_statements" SET "commissionsAmount" = "totalAmount";
