-- Permite proponer una categoría/subcategoría de USUARIO (rubro de negocio,
-- opción "Otro" en el onboarding) usando el mismo flujo de aprobación ya
-- existente para Producto/Servicio/Empleo.
ALTER TYPE "ProposedCategoryTarget" ADD VALUE 'USER_CATEGORY';

-- Solo aplica a USER_CATEGORY: id de la UserCategory bajo la que se propone
-- una subcategoría. Null = propuesta de categoría raíz nueva.
ALTER TABLE "proposed_categories" ADD COLUMN "parentCategoryId" TEXT;
