-- Membresías adicionales; Commerce.userId sigue siendo el propietario canónico.
CREATE TYPE "BusinessMembershipRole" AS ENUM ('ADMIN', 'MANAGER', 'STAFF', 'VIEWER');
CREATE TYPE "BusinessMembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

CREATE TABLE "business_memberships" (
    "id" TEXT NOT NULL,
    "commerceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BusinessMembershipRole" NOT NULL DEFAULT 'STAFF',
    "status" "BusinessMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_memberships_commerceId_userId_key"
    ON "business_memberships"("commerceId", "userId");
CREATE UNIQUE INDEX "business_memberships_id_commerce_id_key"
    ON "business_memberships"("id", "commerceId");
CREATE INDEX "business_memberships_userId_status_idx"
    ON "business_memberships"("userId", "status");
CREATE INDEX "business_memberships_commerceId_status_idx"
    ON "business_memberships"("commerceId", "status");
CREATE UNIQUE INDEX "business_membership_branches_membershipId_branchId_key"
    ON "business_membership_branches"("membershipId", "branchId");
CREATE INDEX "business_membership_branches_commerceId_branchId_idx"
    ON "business_membership_branches"("commerceId", "branchId");

ALTER TABLE "business_memberships"
    ADD CONSTRAINT "business_memberships_commerceId_fkey"
    FOREIGN KEY ("commerceId") REFERENCES "commerces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_memberships"
    ADD CONSTRAINT "business_memberships_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

