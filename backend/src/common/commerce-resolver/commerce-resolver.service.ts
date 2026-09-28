import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, ProfileType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { userFindByIdCacheKey } from '../utils/cache-keys.util';
import { includesProductModule } from '../capabilities/module-requirements';

export const NO_COMMERCE_MESSAGE = 'Esta función requiere un comercio activo en tu cuenta';

/**
 * ¿Este perfil, al activarse, debe tener un Commerce? Regla única compartida
 * por todos los caminos de aprobación (ProfileActivationsService,
 * FreelancerApplicationsService, UsersService.create) y por la migración de
 * backfill:
 *   - BUSINESS: siempre.
 *   - PROFESSIONAL: solo si su categoría incluye un módulo de venta de
 *     producto (menu/inventory/orders) — decisión "opción 2" (2026-09-28).
 */
export function shouldProvisionCommerce(profileType: ProfileType, categoryAllowedModules: readonly string[]): boolean {
  if (profileType === ProfileType.BUSINESS) return true;
  if (profileType === ProfileType.PROFESSIONAL) return includesProductModule(categoryAllowedModules);
  return false;
}

/**
 * Único punto de resolución "userId → commerceId". Antes esto estaba
 * duplicado (copy-pasted) en 12+ servicios (orders, cash, expenses,
 * appointments, delivery, branches, employees, customers, bnpl, menu,
 * receipts, analytics...) — ver WORKPLACE_VISION.md, sección "Estado de la
 * implementación", para el contexto de por qué se consolidó acá antes de
 * tocar la FK de `Commerce`.
 *
 * Un Commerce SOLO se crea explícitamente vía `provision()` al aprobar un
 * perfil (ver shouldProvisionCommerce). Nunca como efecto secundario de leer:
 * antes `resolveOrCreate()` (menú) y CommerceSettingsStrategy.getCommerce()
 * le creaban un Commerce a cualquiera que abriera esas pantallas — incluido
 * SUPERADMIN.
 */
@Injectable()
export class CommerceResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** commerceId del usuario, o null si no tiene. */
  async find(userId: string): Promise<string | null> {
    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
      select: { id: true },
    });
    return commerce?.id ?? null;
  }

  /**
   * commerceId del usuario; 403 si no tiene. Antes devolvía el propio
   * `userId` como fallback: las lecturas salían vacías sin error y las
   * escrituras fallaban por FK (Order/Customer/Delivery... exigen un
   * Commerce real). Los guards (ModuleAccessGuard/CapabilityGuard con
   * HAS_COMMERCE) ya lo cortan antes; esto es la defensa en profundidad.
   */
  async resolve(userId: string): Promise<string> {
    const commerceId = await this.find(userId);
    if (!commerceId) throw new ForbiddenException(NO_COMMERCE_MESSAGE);
    return commerceId;
  }

  /**
   * Crea el Commerce del usuario si no existe (idempotente). Pensado para
   * correr dentro de la transacción de aprobación del perfil. El llamador
   * debe invalidar `userFindByIdCacheKey(userId)` DESPUÉS del commit (ver
   * `invalidateUserCache`) — invalidar dentro de la tx dejaría una ventana
   * donde otra lectura vuelve a cachear `commerce: null`.
   */
  async provision(
    tx: Prisma.TransactionClient,
    params: { userId: string; profileId?: string; name?: string | null },
  ): Promise<string> {
    const existing = await tx.commerce.findUnique({ where: { userId: params.userId }, select: { id: true } });
    if (existing) return existing.id;

    let name = params.name?.trim();
    if (!name) {
      const user = await tx.user.findUnique({
        where: { id: params.userId },
        select: { firstName: true, lastName: true },
      });
      name = `${user?.firstName ?? 'Mi'} ${user?.lastName ?? 'Negocio'}`.trim();
    }
    const created = await tx.commerce.create({
      data: { userId: params.userId, profileId: params.profileId, name },
      select: { id: true },
    });
    return created.id;
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.redis.del(userFindByIdCacheKey(userId));
  }
}
