import { SetMetadata } from '@nestjs/common';

export const CATEGORY_SCOPE_KEY = 'required_category_scope';

export interface CategoryScopeOptions {
  /** Modelo Prisma a consultar por el id recibido — debe exponer `userCategoryIds: string[]`. */
  model: 'serviceCategory' | 'jobCategory';
  /** Campo del body donde llega el id del ítem de catálogo elegido (ej. dto.categoryId). */
  bodyField: string;
}

/**
 * Marca un endpoint de escritura (crear/actualizar un Service, Job, etc.)
 * para que el `categoryId` recibido deba pertenecer al rubro de negocio
 * (UserCategory) del propio usuario — bloquea, por ejemplo, que un
 * proveedor de Transporte publique un servicio bajo "Contabilidad".
 * Complementa a CategoryScopeService (que filtra LISTAS/lectura): esto
 * valida ESCRITURA, mismo patrón que @RequireAccountType/AccountTypeGuard.
 * Si el body no trae el campo (categoría opcional), no bloquea — solo actúa
 * cuando el usuario sí elige una categoría de catálogo.
 * Usage: @RequireCategoryScope({ model: 'serviceCategory', bodyField: 'categoryId' })
 */
export const RequireCategoryScope = (options: CategoryScopeOptions) => SetMetadata(CATEGORY_SCOPE_KEY, options);
