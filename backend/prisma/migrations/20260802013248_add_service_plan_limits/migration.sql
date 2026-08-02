-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "maxServiceRequests" INTEGER NOT NULL DEFAULT -1,
ADD COLUMN     "maxServices" INTEGER NOT NULL DEFAULT -1;
