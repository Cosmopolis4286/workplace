import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type ResolvedAccountType = 'COMMERCE' | 'FREELANCER' | null;

/**
 * Única fuente de lectura para "¿qué tipo de cuenta de negocio es este
 * usuario?". Lee `User.accountType`, con fallback a `User.role` mientras
 * existan filas sin backfillear. No reemplaza RBAC: `role` sigue siendo la
 * fuente de verdad para SUPERADMIN/ADMIN/NORMAL y permisos.
 */
@Injectable()
export class AccountTypeResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string): Promise<ResolvedAccountType> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true, role: true },
    });
    if (!user) return null;
    if (user.accountType) return user.accountType;
    if (user.role === 'COMMERCE' || user.role === 'FREELANCER') return user.role;
    return null;
  }

  isFreelancer(accountType: ResolvedAccountType): boolean {
    return accountType === 'FREELANCER';
  }

  isCommerce(accountType: ResolvedAccountType): boolean {
    return accountType === 'COMMERCE';
  }
}
