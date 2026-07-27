-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('COMMERCE', 'FREELANCER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountType" "AccountType";
