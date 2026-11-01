import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
  WalletWithdrawalStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import { sqlNumeric } from '../../../common/money/money';

const STATUSES = Object.values(WalletWithdrawalStatus);

/**
 * Solicitudes de retiro de saldo. WalletsService.withdraw() descuenta el
 * saldo y crea la solicitud PENDING; aquí un admin la cierra:
 * - PAID: transfirió por fuera a la cuenta de destino (guarda la referencia).
 * - REJECTED: no se pudo pagar; el monto vuelve a la billetera.
 * Cada cierre toma la fila con `updateMany where status=PENDING`, así dos
 * admins (o dos clics) no pueden pagar y rechazar la misma solicitud.
 */
@Injectable()
export class WalletWithdrawalsService {
  private readonly logger = new Logger(WalletWithdrawalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  listMine(userId: string) {
    return this.prisma.walletWithdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listAll(status?: string, page = 1, limit = 20) {
    if (status && !STATUSES.includes(status as WalletWithdrawalStatus)) {
      throw new BadRequestException('Estado de retiro inválido');
    }
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const where = status
      ? { status: status as WalletWithdrawalStatus }
      : undefined;
    const [data, total] = await Promise.all([
      this.prisma.walletWithdrawalRequest.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.walletWithdrawalRequest.count({ where }),
    ]);
    return { data, total, page: Math.max(page, 1), limit: take };
  }

  async markPaid(id: string, adminId: string, payoutReference: string) {
    const request = await this.findPending(id);
    const changed = await this.prisma.walletWithdrawalRequest.updateMany({
      where: { id, status: WalletWithdrawalStatus.PENDING },
      data: {
        status: WalletWithdrawalStatus.PAID,
        payoutReference: payoutReference.trim(),
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    if (changed.count !== 1) {
      throw new ConflictException('Este retiro ya fue procesado');
    }

    await this.notify(request.userId, {
      title: '✅ Retiro pagado',
      message: `Transferimos tu retiro de ${request.amount.toFixed(2)} ${request.currency}. Referencia: ${payoutReference.trim()}.`,
      metadata: { withdrawalId: id },
    });
    return this.prisma.walletWithdrawalRequest.findUnique({ where: { id } });
  }

  async reject(id: string, adminId: string, reason: string) {
    const request = await this.findPending(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.walletWithdrawalRequest.updateMany({
        where: { id, status: WalletWithdrawalStatus.PENDING },
        data: {
          status: WalletWithdrawalStatus.REJECTED,
          rejectionReason: reason.trim(),
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Este retiro ya fue procesado');
      }

      // Reintegro: el saldo se había descontado al solicitar. No se aplica el
      // tope de saldo: es dinero que ya era del usuario.
      const [row] = await tx.$queryRaw<{ new_balance: Prisma.Decimal }[]>`
        UPDATE "wallets"
        SET balance = balance + ${sqlNumeric(request.amount)}::numeric,
            "updatedAt" = NOW()
        WHERE id = ${request.walletId}
        RETURNING balance AS new_balance
      `;
      if (!row) throw new NotFoundException('Billetera no encontrada');

      const reversal = await tx.walletTransaction.create({
        data: {
          walletId: request.walletId,
          userId: request.userId,
          type: WalletTransactionType.CREDIT,
          status: WalletTransactionStatus.COMPLETED,
          amount: request.amount,
          balanceAfter: row.new_balance,
          description: 'Retiro rechazado — saldo reintegrado',
          reference: `WITHDRAWAL-REVERSAL-${id}`,
          metadata: { withdrawalId: id, reason: reason.trim() },
        },
      });
      return tx.walletWithdrawalRequest.update({
        where: { id },
        data: { reversalTransactionId: reversal.id },
      });
    });

    await this.notify(request.userId, {
      title: '↩️ Retiro rechazado',
      message: `Tu retiro de ${request.amount.toFixed(2)} ${request.currency} fue rechazado y el saldo volvió a tu billetera. Motivo: ${reason.trim()}`,
      metadata: { withdrawalId: id },
    });
    return updated;
  }

  private async findPending(id: string) {
    const request = await this.prisma.walletWithdrawalRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Retiro no encontrado');
    if (request.status !== WalletWithdrawalStatus.PENDING) {
      throw new ConflictException('Este retiro ya fue procesado');
    }
    return request;
  }

  // Una notificación fallida no debe revertir una operación de dinero.
  private async notify(
    userId: string,
    dto: { title: string; message: string; metadata?: Record<string, unknown> }
  ) {
    try {
      await this.notifications.createForUser(userId, {
        type: NotificationType.SYSTEM,
        link: '/wallet',
        ...dto,
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo notificar el retiro a ${userId}: ${(err as Error).message}`
      );
    }
  }
}
