-- CreateEnum
CREATE TYPE "VeLocationType" AS ENUM ('MUNICIPIO', 'CIUDAD', 'PARROQUIA');

-- CreateTable
CREATE TABLE "ve_locations" (
    "id" TEXT NOT NULL,
    "type" "VeLocationType" NOT NULL,
    "name" TEXT NOT NULL,
    "stateName" TEXT,
    "postalCode" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ve_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ve_locations_parentId_idx" ON "ve_locations"("parentId");

-- CreateIndex
CREATE INDEX "ve_locations_stateName_idx" ON "ve_locations"("stateName");

-- CreateIndex
CREATE UNIQUE INDEX "ve_locations_name_parentId_type_key" ON "ve_locations"("name", "parentId", "type");

-- AddForeignKey
ALTER TABLE "ve_locations" ADD CONSTRAINT "ve_locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ve_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

