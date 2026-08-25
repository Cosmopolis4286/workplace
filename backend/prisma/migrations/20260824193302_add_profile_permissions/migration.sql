-- CreateTable
CREATE TABLE "profile_permissions" (
    "id" TEXT NOT NULL,
    "profileType" "ProfileType" NOT NULL,
    "subtype" "ProfessionalSubtype",
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "profile_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_permissions_permissionId_idx" ON "profile_permissions"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_permissions_profileType_subtype_permissionId_key" ON "profile_permissions"("profileType", "subtype", "permissionId");

-- AddForeignKey
ALTER TABLE "profile_permissions" ADD CONSTRAINT "profile_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

