import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import { basename, join } from 'path';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../audit/audit.service';
import { userFindByIdCacheKey } from '../../../common/utils/cache-keys.util';
import { isPositive } from '../../../common/money/money';

// Garantías que todavía comprometen fondos de alguien: con cualquiera de
// ellas abierta, borrar la cuenta dejaría a la otra parte sin contraparte.
const OPEN_ESCROW_STATUSES = ['HELD', 'PENDING_FUNDS', 'DISPUTED'] as const;

/**
 * Elimina la cuenta de un usuario a pedido suyo (requisito de Google Play y
 * de la política de privacidad).
 *
 * No borra la fila de User: los registros financieros (movimientos de
 * wallet, garantías, comisiones, comprobantes de depósito) y las reseñas
 * apuntan a ella y deben conservarse. En su lugar la anonimiza — sin email,
 * nombre, teléfono, fecha de nacimiento, ubicación ni fotos —, la desactiva
 * (login y JWT ya rechazan isActive=false) y borra todo lo que es contenido
 * o identificación personal: sesiones, publicaciones, seguidores,
 * notificaciones, dispositivos y documentos KYC.
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService
  ) {}

  /**
   * Motivos que impiden borrar la cuenta ahora mismo. Vacío = se puede.
   * El frontend lo muestra antes de pedir la confirmación.
   */
  async getBlockers(userId: string): Promise<string[]> {
    const [user, wallet, openEscrows, pendingDeposits] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
      this.prisma.wallet.findUnique({
        where: { userId },
        select: { balance: true, currency: true },
      }),
      this.prisma.escrow.count({
        where: {
          OR: [{ payerId: userId }, { payeeId: userId }],
          status: { in: [...OPEN_ESCROW_STATUSES] },
        },
      }),
      this.prisma.walletDepositRequest.count({
        where: { userId, status: 'PENDING' },
      }),
    ]);

    const blockers: string[] = [];
    if (wallet && isPositive(wallet.balance)) {
      blockers.push(
        `Tienes saldo en tu wallet (${wallet.balance} ${wallet.currency}). Retíralo o úsalo antes de eliminar la cuenta.`
      );
    }
    if (openEscrows > 0) {
      blockers.push(
        `Tienes ${openEscrows} pago(s) protegido(s) en curso o en disputa. Espera a que se liberen o se reembolsen.`
      );
    }
    if (pendingDeposits > 0) {
      blockers.push(
        `Tienes ${pendingDeposits} depósito(s) pendiente(s) de revisión. Espera a que se aprueben o se rechacen.`
      );
    }
    if (user?.role === Role.SUPERADMIN) {
      const superadmins = await this.prisma.user.count({
        where: { role: Role.SUPERADMIN, isActive: true },
      });
      if (superadmins <= 1) {
        blockers.push(
          'Eres el único SUPERADMIN activo. Asigna el rol a otra persona antes de eliminar tu cuenta.'
        );
      }
    }
    return blockers;
  }

  async deleteAccount(
    userId: string,
    context: { ip?: string; userAgent?: string } = {}
  ): Promise<void> {
    const blockers = await this.getBlockers(userId);
    if (blockers.length > 0) {
      throw new ConflictException({
        message: 'No se puede eliminar la cuenta todavía',
        errorCode: 'ACCOUNT_DELETION_BLOCKED',
        blockers,
      });
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        email: true,
        role: true,
        avatar: true,
        coverImage: true,
        posts: { select: { media: { select: { url: true } } } },
        services: { select: { images: true } },
        identityVerifications: {
          select: {
            frontImageUrl: true,
            backImageUrl: true,
            selfieImageUrl: true,
          },
        },
      },
    });

    const publicFiles = [
      user.avatar,
      user.coverImage,
      ...user.posts.flatMap((p) => p.media.map((m) => m.url)),
      ...user.services.flatMap((s) => s.images),
    ];
    const kycFiles = user.identityVerifications.flatMap((v) => [
      v.frontImageUrl,
      v.backImageUrl,
      v.selfieImageUrl,
    ]);

    // Contraseña aleatoria: nadie la conoce, y aunque se reactivara la fila
    // nadie podría entrar con ella.
    const unusablePassword = await bcrypt.hash(randomUUID(), 10);

    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
      this.prisma.emailVerificationToken.deleteMany({ where: { userId } }),
      this.prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
      this.prisma.deviceToken.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.follow.deleteMany({
        where: { OR: [{ followerId: userId }, { followingId: userId }] },
      }),
      this.prisma.postLike.deleteMany({ where: { userId } }),
      this.prisma.postComment.deleteMany({ where: { userId } }),
      this.prisma.post.deleteMany({ where: { userId } }),
      this.prisma.service.updateMany({
        where: { userId },
        data: { status: 'INACTIVE', images: [] },
      }),
      this.prisma.job.updateMany({
        where: { employerId: userId, status: { not: 'CLOSED' } },
        data: { status: 'CLOSED' },
      }),
      this.prisma.userProfile.updateMany({
        where: { userId },
        data: { status: 'SUSPENDED' },
      }),
      // El registro de KYC se conserva (estado y fechas de la revisión),
      // pero sin nombre legal, número de documento, nacimiento ni imágenes.
      this.prisma.identityVerification.updateMany({
        where: { userId },
        data: {
          fullName: '',
          documentNumber: '',
          birthDate: null,
          frontImageUrl: '',
          backImageUrl: null,
          selfieImageUrl: '',
        },
      }),
      this.prisma.freelancerSettings.updateMany({
        where: { userId },
        data: {
          professionalName: null,
          slug: null,
          description: null,
          latitude: null,
          longitude: null,
          socialLinks: Prisma.DbNull,
        },
      }),
      this.prisma.commerce.updateMany({
        where: { userId },
        data: {
          name: 'Comercio eliminado',
          slug: null,
          description: null,
          address: null,
          phone: null,
          email: null,
          schedule: null,
          city: null,
          municipality: null,
          parish: null,
          latitude: null,
          longitude: null,
          socialLinks: Prisma.DbNull,
          isPublic: false,
        },
      }),
      // Un conductor pertenece al comercio que lo contrató: el registro queda
      // para su historial de entregas, sin datos de la persona.
      this.prisma.driver.updateMany({
        where: { userId },
        data: {
          name: 'Conductor eliminado',
          phone: null,
          vehiclePlate: null,
          isActive: false,
          currentLat: null,
          currentLng: null,
          currentHeading: null,
          currentSpeed: null,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `eliminado-${userId}@eliminado.invalid`,
          username: null,
          password: unusablePassword,
          firstName: 'Usuario',
          lastName: 'eliminado',
          phone: null,
          birthDate: null,
          sex: null,
          avatar: null,
          coverImage: null,
          country: null,
          state: null,
          city: null,
          municipality: null,
          parish: null,
          latitude: null,
          longitude: null,
          emailVerified: false,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorEnabledAt: null,
          isActive: false,
        },
      }),
    ]);

    await this.audit.log({
      userId,
      userRole: user.role,
      action: 'DELETE',
      module: 'account',
      entityId: userId,
      summary: 'El usuario eliminó su cuenta (datos personales anonimizados)',
      ip: context.ip,
      userAgent: context.userAgent,
    });

    // Lo que sigue es limpieza: la cuenta ya está desactivada y anonimizada,
    // así que un fallo aquí no debe revertir el borrado ni devolver error.
    await this.clearSessions(userId);
    await Promise.all([
      ...publicFiles.map((url) => this.removeFile(url, 'uploads')),
      ...kycFiles.map((url) => this.removeFile(url, 'private-uploads/kyc')),
    ]);
    this.logger.log(`Cuenta ${userId} eliminada a pedido del usuario`);
  }

  private async clearSessions(userId: string): Promise<void> {
    try {
      await this.redis.del(userFindByIdCacheKey(userId));
      await this.redis.deleteByPattern(`session:${userId}:*`);
    } catch (err) {
      this.logger.warn(
        `No se pudieron limpiar las sesiones en Redis de ${userId}: ${(err as Error).message}`
      );
    }
  }

  // Las URLs guardadas tienen forma "/uploads/<carpeta>/<archivo>". Para los
  // públicos se respeta la carpeta; para KYC (fuera de uploads/) solo vale
  // el nombre de archivo. Nunca se sale del directorio base.
  private async removeFile(
    url: string | null | undefined,
    baseDir: 'uploads' | 'private-uploads/kyc'
  ): Promise<void> {
    if (!url) return;
    let path: string;
    if (baseDir === 'uploads') {
      const match = url.match(/^\/uploads\/([\w-]+)\/([^/\\]+)$/);
      if (!match) return;
      path = join(process.cwd(), 'uploads', match[1], basename(match[2]));
    } else {
      path = join(process.cwd(), baseDir, basename(url));
    }
    try {
      await unlink(path);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(
          `No se pudo borrar ${path}: ${(err as Error).message}`
        );
      }
    }
  }
}
