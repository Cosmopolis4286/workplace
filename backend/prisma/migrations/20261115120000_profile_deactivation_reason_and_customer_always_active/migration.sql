-- CreateEnum
CREATE TYPE "ProfileDeactivationReason" AS ENUM ('NOT_USING', 'TEMPORARY_PAUSE', 'SWITCHING_PROFILE', 'TOO_EXPENSIVE', 'LOW_DEMAND', 'PLATFORM_ISSUES', 'PRIVACY', 'OTHER');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivationNote" TEXT,
ADD COLUMN     "deactivationReason" "ProfileDeactivationReason";


-- El perfil Cliente siempre está activo: todo usuario puede comprar.
-- Se crea uno ACTIVE a quien no tenga ninguno ACTIVE (los Cliente viejos en
-- otro estado quedan como historial; así nunca hay dos activos).
INSERT INTO "user_profiles" ("id", "userId", "type", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u."id", 'CUSTOMER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "user_profiles" p
  WHERE p."userId" = u."id" AND p."type" = 'CUSTOMER' AND p."status" = 'ACTIVE'
);
