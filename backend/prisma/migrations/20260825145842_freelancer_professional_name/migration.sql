-- Nombre público con el que un FREELANCER se identifica en el onboarding y
-- su perfil, distinto de User.firstName/lastName. Nullable: no afecta filas
-- existentes.
ALTER TABLE "freelancer_settings" ADD COLUMN "professionalName" TEXT;
