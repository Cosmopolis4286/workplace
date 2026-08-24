import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { userFindByIdCacheKey } from '../utils/cache-keys.util';

/**
 * Único punto de resolución "userId → commerceId". Antes esto estaba
 * duplicado (copy-pasted) en 12+ servicios (orders, cash, expenses,
 * appointments, delivery, branches, employees, customers, bnpl, menu,
 * receipts, analytics...) — ver WORKPLACE_VISION.md, sección "Estado de la
 * implementación", para el contexto de por qué se consolidó acá antes de
 * tocar la FK de `Commerce`.
 */
@Injectable()
export class CommerceResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Resuelve el commerceId de un usuario. Si el usuario no tiene `Commerce`,
   * devuelve el propio `userId` como fallback — mismo comportamiento que
   * tenían los 11 `getCommerceId` duplicados que no auto-creaban.
   */
  async resolve(userId: string): Promise<string> {
    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
      select: { id: true },
    });
    return commerce?.id ?? userId;
  }

  /**
   * Igual que `resolve()`, pero si el usuario no tiene `Commerce` todavía lo
   * crea (comportamiento que solo tenía MenuService.getCommerceId — usado
   * cuando la operación que sigue requiere un Commerce real, no el fallback
   * a userId).
   */
  async resolveOrCreate(userId: string): Promise<string> {
    const commerce = await this.prisma.commerce.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (commerce) return commerce.id;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const created = await this.prisma.commerce.create({
      data: { userId, name: `${user?.firstName ?? 'Mi'} ${user?.lastName ?? 'Negocio'}`.trim() },
      select: { id: true },
    });
    // findById cachea `commerce` (Commerce) — sin esto un findById previo a
    // la creación del commerce (commerce: null) queda stale hasta el TTL.
    await this.redis.del(userFindByIdCacheKey(userId));
    return created.id;
  }
}
