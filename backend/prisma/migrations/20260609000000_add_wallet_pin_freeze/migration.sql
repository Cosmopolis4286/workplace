-- AlterTable: add PIN and freeze fields to wallets
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "pin" TEXT;
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "pinSetAt" TIMESTAMP(3);
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "frozenAt" TIMESTAMP(3);
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "frozenBy" TEXT;
