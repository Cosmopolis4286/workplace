-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('CUSTOMER', 'PROFESSIONAL', 'JOB_SEEKER', 'BUSINESS');

-- CreateEnum
CREATE TYPE "ProfessionalSubtype" AS ENUM ('FREELANCER', 'SERVICE_PROVIDER');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "commerces" ADD COLUMN     "profileId" TEXT;

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ProfileType" NOT NULL,
    "subtype" "ProfessionalSubtype",
    "status" "ProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_profiles_userId_idx" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_profiles_status_idx" ON "user_profiles"("status");

-- CreateIndex
CREATE INDEX "user_profiles_type_status_idx" ON "user_profiles"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "commerces_profileId_key" ON "commerces"("profileId");

-- AddForeignKey
ALTER TABLE "commerces" ADD CONSTRAINT "commerces_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

