import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  Role,
  WithdrawalStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../engagement/notifications/notifications.service';
import {
  EXCHANGE_RATES_FACADE,
  ExchangeRatesFacade,
} from '../exchange-rates/exchange-rates.facade';
import { SellerPaymentAccountsService } from '../payments/manual/seller-payment-accounts.service';
import {
  normalizeReference,
  snapshotAccount,
  withPayableAmounts,
  type PayableAccountFields,
} from '../payments/manual/payable-accounts';
import { WalletsService } from '../wallets/wallets.service';
import { CreateWithdrawalDto } from './dto/wallet-withdrawal.dto';

// Un retiro en revisión a la vez: el admin paga en orden y el usuario no
// fragmenta su saldo en muchas solicitudes.
const MAX_PENDING_PER_USER = 1;

/**
 * Retiro real del saldo de la billetera. La billetera ya no recibe recargas:
 * el saldo que queda (devoluciones de garantías, cobros de Pago Protegido) se
 * retira a una cuenta bancaria. El saldo se debita al pedir el retiro, un
 * admin hace la transferencia y registra la referencia; si la rechaza, el
 * monto vuelve a la billetera.
 */
@Injectable()
export class WalletWithdrawalsService {
  private readonly logger = new Logger(WalletWithdrawalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService,
    private readonly accounts: SellerPaymentAccountsService,
    private readonly notifications: NotificationsService,
    @Inject(EXCHANGE_RATES_FACADE)
    private readonly rates: ExchangeRatesFacade
  ) {}

  listMine(userId: string) {
    return this.prisma.walletWithdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(userId: string, role: Role, dto: CreateWithdrawalDto) {
    const destination = await this.resolveDestination(userId, dto);

    const pending = await this.prisma.walletWithdrawalRequest.count({
      where: { userId, status: WithdrawalStatus.PENDING },
    });
    if (pending >= MAX_PENDING_PER_USER) {
      throw new ConflictException(
        'Ya tienes un retiro en proceso; espera a que se pague'
      );
    }

    const amount = new Prisma.Decimal(dto.amount).toDecimalPlaces(2);
    const [priced] = await withPayableAmounts(
      this.rates,
      [destination],
      'USD',
      amount
    );
    if (priced.amount === null) {
      throw new ConflictException(
        'No hay una tasa de cambio vigente para retirar en esta moneda'
      );
    }

    // El id se fija antes para que el débito lleve la referencia del retiro.
    const id = randomUUID();
    await this.wallets.withdraw(userId, role, {
      amount: dto.amount,
      pin: dto.pin,
      description: 'Retiro a cuenta bancaria',
      reference: `WITHDRAWAL-${id}`,
    });

    try {
      return await this.prisma.walletWithdrawalRequest.create({
        data: {
          id,
          userId,
          amount,
          currency: 'USD',
          destination: snapshotAccount(destination),
          payoutCurrency: destination.currency,
          payoutAmount: priced.amount,
          exchangeRate: priced.exchangeRate,
        },
      });
    } catch (err) {
      // Sin solicitud registrada nadie pagaría el retiro: devuelve el saldo.
      this.logger.error(
        `No se pudo registrar el retiro ${id}; se devuelve el saldo`,
        err as Error
      );
      await this.wallets.deposit(
        userId,
        role,
        {
          amount: dto.amount,
          description: 'Retiro no registrado (devolución)',
          reference: `WITHDRAWAL-REFUND-${id}`,
        },
        { retryEscrows: false }
      );
      throw new ConflictException(
        'No se pudo registrar el retiro; tu saldo no cambió'
      );
    }
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async list(status?: WithdrawalStatus) {
    const rows = await this.prisma.walletWithdrawalRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    return rows.map(({ user, ...row }) => ({
      ...row,
      userName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      userEmail: user.email,
    }));
  }

  async markPaid(adminId: string, id: string, payoutReference: string) {
    const reference = normalizeReference(payoutReference);
    if (!reference) {
      throw new BadRequestException(
        'Referencia inválida: usa entre 4 y 30 letras o números'
      );
    }
    const request = await this.findPending(id);
    await this.settle(id, {
      status: WithdrawalStatus.PAID,
      payoutReference: reference,
      reviewedById: adminId,
    });
    await this.notify(request.userId, {
      title: '✅ Retiro pagado',
      message: `Enviamos ${this.formatPayout(request)} a tu cuenta (ref. ${reference}).`,
      metadata: { withdrawalId: id },
    });
    return { paid: true };
  }

  async reject(adminId: string, id: string, reason: string) {
    const trimmed = reason?.trim();
    if (!trimmed || trimmed.length < 5) {
      throw new BadRequestException('Explica al usuario por qué se rechaza');
    }
    const request = await this.findPending(id);
    await this.settle(id, {
      status: WithdrawalStatus.REJECTED,
      rejectionReason: trimmed,
      reviewedById: adminId,
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: request.userId },
      select: { role: true },
    });
    try {
      await this.wallets.deposit(
        request.userId,
        user.role,
        {
          amount: request.amount.toNumber(),
          description: 'Retiro rechazado (devolución)',
          reference: `WITHDRAWAL-REFUND-${id}`,
        },
        { retryEscrows: false }
      );
    } catch (err) {
      // Sin devolución el retiro debe seguir pendiente (ej. billetera congelada).
      await this.prisma.walletWithdrawalRequest.update({
        where: { id },
        data: {
          status: WithdrawalStatus.PENDING,
          rejectionReason: null,
          reviewedById: null,
          reviewedAt: null,
        },
      });
      throw new ConflictException(
        `No se pudo devolver el saldo: ${(err as Error).message}`
      );
    }

    await this.notify(request.userId, {
      title: '⚠️ Retiro rechazado',
      message: `Tu retiro de $${request.amount.toFixed(2)} fue rechazado: ${trimmed}. El monto volvió a tu billetera.`,
      metadata: { withdrawalId: id },
    });
    return { rejected: true };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async resolveDestination(
    userId: string,
    dto: CreateWithdrawalDto
  ): Promise<PayableAccountFields> {
    if (dto.accountId) {
      const account = await this.prisma.sellerPaymentAccount.findFirst({
        where: { id: dto.accountId, userId },
      });
      if (!account) throw new NotFoundException('Cuenta no encontrada');
      return account;
    }
    if (dto.destination) return this.accounts.normalize(dto.destination);
    throw new BadRequestException('Indica la cuenta donde quieres recibirlo');
  }

  private async findPending(id: string) {
    const request = await this.prisma.walletWithdrawalRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Retiro no encontrado');
    if (request.status !== WithdrawalStatus.PENDING) {
      throw new ConflictException('Este retiro ya fue procesado');
    }
    return request;
  }

  private async settle(
    id: string,
    data: Prisma.WalletWithdrawalRequestUpdateManyMutationInput
  ) {
    const changed = await this.prisma.walletWithdrawalRequest.updateMany({
      where: { id, status: WithdrawalStatus.PENDING },
      data: { ...data, reviewedAt: new Date() },
    });
    if (changed.count !== 1) {
      throw new ConflictException('Este retiro ya fue procesado');
    }
  }

  private formatPayout(request: {
    payoutAmount: Prisma.Decimal;
    payoutCurrency: string;
  }) {
    const prefix = request.payoutCurrency === 'USD' ? '$' : 'Bs. ';
    return `${prefix}${request.payoutAmount.toFixed(2)}`;
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
    } catch {
      // best-effort
    }
  }
}
