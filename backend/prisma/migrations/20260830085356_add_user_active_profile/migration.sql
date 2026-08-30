-- AlterTable
-- Contexto de UX activo ("estoy usando WorkPlace como..."). Aditiva y
-- nullable: no requiere backfill — sin valor, el frontend infiere el
-- default con la misma prioridad que AccountTypeResolver (BUSINESS >
-- PROFESSIONAL > JOB_SEEKER > CUSTOMER). No participa en permisos ni
-- capacidades, que siguen siendo la unión de TODOS los UserProfile ACTIVE.
ALTER TABLE "users" ADD COLUMN     "activeProfileId" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_activeProfileId_fkey" FOREIGN KEY ("activeProfileId") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
