import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Única fuente de verdad para "¿este ítem de catálogo aplica al rubro de
 * negocio (UserCategory) de este usuario?" — reemplaza el filtrado ad-hoc
 * que cada dominio reimplementaba por su cuenta (PlansService.getPublicPlans,
 * ServicesService.getCatalogCategories, JobsService.getCategories), cada uno
 * con su propia variante de `item.categoryIds.includes(userCategoryId)`.
 *
 * Convención de dato: cualquier modelo que se quiera filtrar por rubro
 * declara `userCategoryIds: String[] @default([])` (mismo shape que ya usaba
 * Plan.categoryIds antes de esta clase) — un array suelto de UserCategory.id,
 * sin FK formal. Vacío = visible para cualquier rubro (default permisivo:
 * un ítem nuevo sin scope configurar sigue viéndose por todos, no desaparece
 * por accidente). No se modeló como tabla de relación (join table) porque
 * "vacío = todos" no tiene una representación limpia con filas de relación,
 * y esta filtra en memoria sobre listas ya pequeñas (catálogos, no volúmenes
 * transaccionales) — no justifica el join.
 *
 * No cubre `UserCategory.allowedModules` (qué MÓDULOS de la app — menu,
 * delivery, corridas — habilita un rubro): ese es un concepto distinto
 * (un solo campo por categoría, no una lista de ítems con scope), vive en
 * PlanLimitsService.intersectWithCategory() y no se migró aquí a propósito
 * — forzarlo a esta misma forma sería una abstracción menos clara, no más.
 */
@Injectable()
export class CategoryScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /** true si el ítem aplica al rubro `userCategoryId` (o no tiene scope — aplica a todos). */
  isVisibleForCategory(itemUserCategoryIds: string[], userCategoryId: string | null | undefined): boolean {
    if (itemUserCategoryIds.length === 0) return true;
    if (!userCategoryId) return false;
    return itemUserCategoryIds.includes(userCategoryId);
  }

  /** Filtra una lista de ítems con `userCategoryIds` a los que aplican al rubro dado. */
  filterByCategory<T extends { userCategoryIds: string[] }>(
    items: T[],
    userCategoryId: string | null | undefined,
  ): T[] {
    return items.filter((item) => this.isVisibleForCategory(item.userCategoryIds, userCategoryId));
  }

  /** Resuelve el categoryId de negocio del usuario — punto único de lectura para no repetir `prisma.user.findUnique` en cada consumidor. */
  async getUserCategoryId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { categoryId: true } });
    return user?.categoryId ?? null;
  }
}
