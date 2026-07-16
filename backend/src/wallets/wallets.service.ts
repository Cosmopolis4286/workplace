import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, WalletTransactionType, WalletTransactionStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WalletPinService } from './wallet-pin.service';
import { WalletLimitsService } from './wallet-limits.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { QueryWalletTransactionsDto } from './dto/query-wallet-transactions.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransferDto } from './dto/transfer.dto';
import { PaymentDto } from './dto/payment.dto';
import { AdjustDto } from './dto/adjust.dto';
import { SetPinDto, ChangePinDto } from './dto/set-pin.dto';

const ADMIN_ROLES: Role[] = [Role.SUPERADMIN, Role.ADMIN];
const IDEMPOTENCY_TTL = 60 * 60; // 1 hour

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly pinService: WalletPinService,
    private readonly limitsService: WalletLimitsService,
  ) {}

  // ─── Wallet CRUD ─────────────────────────────────────────────────────────────

  async ensureWalletForUser(userId: string, currency = 'USD') {
    const normalizedCurrency = this.normalizeCurrency(currency);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.wallet.upsert({
      where: { userId },
      create: { userId, currency: normalizedCurrency },
      update: {},
      include: this.walletInclude(),
    });
  }

  async createForCurrentUser(userId: string, dto: CreateWalletDto) {
    if (dto.userId && dto.userId !== userId) {
      throw new ForbiddenException('Solo puedes crear tu propia billetera');
    }
    return this.ensureWalletForUser(userId, dto.currency);
  }

  async createForUser(targetUserId: string, dto: CreateWalletDto, actorRole: Role) {
    this.assertAdmin(actorRole);
    return this.ensureWalletForUser(targetUserId, dto.currency);
  }

  async getCurrentUserWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: this.walletInclude(),
    });
    if (!wallet) throw new NotFoundException('Billetera no encontrada');

    const { pin: _, ...safeWallet } = wallet as any;
    return { ...safeWallet, hasPin: !!wallet.pin };
  }

  async getUserWallet(targetUserId: string, actorRole: Role) {
    this.assertAdmin(actorRole);
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: targetUserId },
      include: this.walletInclude(),
    });
    if (!wallet) throw new NotFoundException('Billetera no encontrada');
    const { pin: _, ...safeWallet } = wallet as any;
    return { ...safeWallet, hasPin: !!wallet.pin };
  }

  async listWallets(actorRole: Role, page = 1, limit = 20) {
    this.assertAdmin(actorRole);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [rawData, total] = await Promise.all([
      this.prisma.wallet.findMany({
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: this.walletInclude(),
      }),
      this.prisma.wallet.count(),
    ]);

    const data = rawData.map(({ pin: _, ...w }) => ({ ...w, hasPin: !!_ }));
    return { data, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
  }

  // ─── PIN management ───────────────────────────────────────────────────────────

  async setPin(userId: string, dto: SetPinDto) {
    return this.pinService.setPin(userId, dto.pin);
  }

  async changePin(userId: string, dto: ChangePinDto) {
    return this.pinService.changePin(userId, dto.currentPin, dto.newPin);
  }

  async removePin(userId: string, dto: SetPinDto) {
    return this.pinService.removePin(userId, dto.pin);
  }

  // ─── Freeze / unfreeze (admin only) ──────────────────────────────────────────

  async freezeWallet(targetUserId: string, actorId: string, actorRole: Role) {
    this.assertAdmin(actorRole);
    const wallet = await this.prisma.wallet.findUnique({ where: { userId: targetUserId } });
    if (!wallet) throw new NotFoundException('Billetera no encontrada');
    if (wallet.frozenAt) throw new BadRequestException('La billetera ya está congelada');

    return this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { frozenAt: new Date(), frozenBy: actorId, status: 'SUSPENDED' },
      include: this.walletInclude(),
    });
  }

  async unfreezeWallet(targetUserId: string, actorRole: Role) {
    this.assertAdmin(actorRole);
    const wallet = await this.prisma.wallet.findUnique({ where: { userId: targetUserId } });
    if (!wallet) throw new NotFoundException('Billetera no encontrada');
    if (!wallet.frozenAt) throw new BadRequestException('La billetera no está congelada');

    return this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { frozenAt: null, frozenBy: null, status: 'ACTIVE' },
      include: this.walletInclude(),
    });
  }

  // ─── Limits ───────────────────────────────────────────────────────────────────

  async getMyLimits(userId: string, role: Role) {
    return this.limitsService.getLimitsStatus(userId, role);
  }

  // ─── Financial operations ─────────────────────────────────────────────────────

  async deposit(userId: string, role: Role, dto: DepositDto) {
    if (dto.idempotencyKey) {
      const cached = await this.getIdempotent(dto.idempotencyKey, userId, 'deposit');
      if (cached) return cached;
    }

    const { wallet } = await this.getActiveWallet(userId);
    this.assertPositiveAmount(dto.amount);

    // Balance ceiling check against current balance (pre-transaction check; atomic guard inside tx)
    const limits = await this.limitsService.getLimitsForRole(role);
    await this.limitsService.assertBalanceLimit(userId, role, wallet.balance + dto.amount);

    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic UPDATE: enforce ceiling inside the transaction to prevent race
      const [row] = await tx.$queryRaw<{ new_balance: number }[]>`
        UPDATE "Wallet"
        SET balance = balance + ${dto.amount}::numeric,
            "updatedAt" = NOW()
        WHERE id = ${wallet.id}
          AND balance + ${dto.amount}::numeric <= ${limits.maxBalance}::numeric
        RETURNING balance AS new_balance
      `;
      if (!row) throw new BadRequestException('La operación superaría el límite de saldo permitido');

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id, userId,
          type: WalletTransactionType.CREDIT,
          status: WalletTransactionStatus.COMPLETED,
          amount: dto.amount,
          balanceAfter: row.new_balance,
          description: dto.description ?? 'Depósito',
          reference: dto.reference ?? dto.idempotencyKey,
          metadata: dto.metadata,
        },
      });
      return { wallet: { ...wallet, balance: row.new_balance }, transaction };
    });

    if (dto.idempotencyKey) {
      await this.setIdempotent(dto.idempotencyKey, userId, 'deposit', result);
    }
    return result;
  }

  async withdraw(userId: string, role: Role, dto: WithdrawDto) {
    // Idempotency before PIN so a replay doesn't consume another PIN attempt
    if (dto.idempotencyKey) {
      const cached = await this.getIdempotent(dto.idempotencyKey, userId, 'withdraw');
      if (cached) return cached;
    }

    await this.pinService.verifyPin(userId, dto.pin);

    const { wallet } = await this.getActiveWallet(userId);
    this.assertPositiveAmount(dto.amount);
    this.assertSufficientFunds(wallet.balance, dto.amount);

    await Promise.all([
      this.limitsService.assertSingleTxLimit(userId, role, dto.amount),
      this.limitsService.assertDailyDebitLimit(userId, role, dto.amount),
      this.limitsService.assertMonthlyDebitLimit(userId, role, dto.amount),
    ]);

    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic debit: WHERE balance >= amount prevents double-spend race
      const [row] = await tx.$queryRaw<{ new_balance: number }[]>`
        UPDATE "Wallet"
        SET balance = balance - ${dto.amount}::numeric,
            "updatedAt" = NOW()
        WHERE id = ${wallet.id}
          AND balance >= ${dto.amount}::numeric
        RETURNING balance AS new_balance
      `;
      if (!row) throw new BadRequestException('Saldo insuficiente');

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id, userId,
          type: WalletTransactionType.DEBIT,
          status: WalletTransactionStatus.COMPLETED,
          amount: dto.amount, balanceAfter: row.new_balance,
          description: dto.description ?? 'Retiro',
          reference: dto.reference ?? dto.idempotencyKey,
          metadata: dto.metadata,
        },
      });
      return { wallet: { ...wallet, balance: row.new_balance }, transaction };
    });

    // Record limits after commit — best-effort; loss is acceptable (limits are soft caps)
    await this.limitsService.recordDebit(userId, dto.amount);

    if (dto.idempotencyKey) {
      await this.setIdempotent(dto.idempotencyKey, userId, 'withdraw', result);
    }
    return result;
  }

  async transfer(senderId: string, role: Role, dto: TransferDto) {
    if (dto.recipientUserId === senderId) {
      throw new BadRequestException('No puedes transferirte fondos a ti mismo');
    }

    // PIN required
    await this.pinService.verifyPin(senderId, dto.pin);

    if (dto.idempotencyKey) {
      const cached = await this.getIdempotent(dto.idempotencyKey, senderId, 'transfer');
      if (cached) return cached;
    }

    this.assertPositiveAmount(dto.amount);
    const { wallet: senderWallet } = await this.getActiveWallet(senderId);
    this.assertSufficientFunds(senderWallet.balance, dto.amount);

    // Limits
    await Promise.all([
      this.limitsService.assertSingleTxLimit(senderId, role, dto.amount),
      this.limitsService.assertDailyDebitLimit(senderId, role, dto.amount),
      this.limitsService.assertMonthlyDebitLimit(senderId, role, dto.amount),
      this.limitsService.assertDailyTransferLimit(senderId, role),
    ]);

    // Generic error — don't reveal if recipient wallet exists
    const recipientWallet = await this.prisma.wallet.findUnique({
      where: { userId: dto.recipientUserId },
    });
    if (!recipientWallet || recipientWallet.status !== 'ACTIVE') {
      throw new BadRequestException('No se pudo procesar la transferencia. Verifica el destinatario.');
    }

    const ref = `TRF-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Atomic debit of sender: WHERE balance >= amount prevents double-spend race
      const [senderRow] = await tx.$queryRaw<{ new_balance: number }[]>`
        UPDATE "Wallet"
        SET balance = balance - ${dto.amount}::numeric,
            "updatedAt" = NOW()
        WHERE id = ${senderWallet.id}
          AND balance >= ${dto.amount}::numeric
        RETURNING balance AS new_balance
      `;
      if (!senderRow) throw new BadRequestException('Saldo insuficiente');

      // Atomic credit of recipient
      const [recipientRow] = await tx.$queryRaw<{ new_balance: number }[]>`
        UPDATE "Wallet"
        SET balance = balance + ${dto.amount}::numeric,
            "updatedAt" = NOW()
        WHERE id = ${recipientWallet.id}
        RETURNING balance AS new_balance
      `;

      const updatedSender    = { ...senderWallet,    balance: senderRow.new_balance };
      const updatedRecipient = { ...recipientWallet, balance: recipientRow.new_balance };
      const [debit, credit] = await Promise.all([
        tx.walletTransaction.create({
          data: {
            walletId: senderWallet.id, userId: senderId,
            type: WalletTransactionType.DEBIT,
            status: WalletTransactionStatus.COMPLETED,
            amount: dto.amount, balanceAfter: senderNewBalance,
            description: dto.description ?? 'Transferencia enviada',
            reference: ref,
            metadata: { recipientUserId: dto.recipientUserId, ...dto.metadata },
          },
        }),
        tx.walletTransaction.create({
          data: {
            walletId: recipientWallet.id, userId: dto.recipientUserId,
            type: WalletTransactionType.CREDIT,
            status: WalletTransactionStatus.COMPLETED,
            amount: dto.amount, balanceAfter: recipientNewBalance,
            description: dto.description ?? 'Transferencia recibida',
            reference: ref,
            metadata: { senderUserId: senderId, ...dto.metadata },
          },
        }),
      ]);
      return {
        reference: ref,
        sender:    { wallet: updatedSender,    transaction: debit },
        recipient: { wallet: updatedRecipient, transaction: credit },
      };
    });

    await Promise.all([
      this.limitsService.recordDebit(senderId, dto.amount),
      this.limitsService.recordTransfer(senderId),
    ]);

    if (dto.idempotencyKey) {
      await this.setIdempotent(dto.idempotencyKey, senderId, 'transfer', result);
    }
    return result;
  }

  async payment(userId: string, role: Role, dto: PaymentDto) {
    // Idempotency before PIN so a replay doesn't consume another PIN attempt
    if (dto.idempotencyKey) {
      const cached = await this.getIdempotent(dto.idempotencyKey, userId, 'payment');
      if (cached) return cached;
    }

    await this.pinService.verifyPin(userId, dto.pin);

    const { wallet } = await this.getActiveWallet(userId);
    this.assertPositiveAmount(dto.amount);
    this.assertSufficientFunds(wallet.balance, dto.amount);

    await Promise.all([
      this.limitsService.assertSingleTxLimit(userId, role, dto.amount),
      this.limitsService.assertDailyDebitLimit(userId, role, dto.amount),
    ]);

    const ref = dto.orderId
      ? `PAY-ORDER-${dto.orderId}`
      : dto.serviceRequestId
        ? `PAY-SVC-${dto.serviceRequestId}`
        : `PAY-${Date.now()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ new_balance: number }[]>`
        UPDATE "Wallet"
        SET balance = balance - ${dto.amount}::numeric,
            "updatedAt" = NOW()
        WHERE id = ${wallet.id}
          AND balance >= ${dto.amount}::numeric
        RETURNING balance AS new_balance
      `;
      if (!row) throw new BadRequestException('Saldo insuficiente');

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id, userId,
          type: WalletTransactionType.DEBIT,
          status: WalletTransactionStatus.COMPLETED,
          amount: dto.amount, balanceAfter: row.new_balance,
          description: dto.description ?? 'Pago con billetera',
          reference: ref,
          metadata: { orderId: dto.orderId, serviceRequestId: dto.serviceRequestId, ...dto.metadata },
        },
      });
      return { wallet: { ...wallet, balance: row.new_balance }, transaction };
    });

    await this.limitsService.recordDebit(userId, dto.amount);

    if (dto.idempotencyKey) {
      await this.setIdempotent(dto.idempotencyKey, userId, 'payment', result);
    }
    return result;
  }

  // Débito de comisión de plataforma iniciado por el sistema — no requiere PIN.
  // Usa UPDATE ... RETURNING con GREATEST para que el clamp a 0 sea atómico
  // en la DB (elimina el race entre SELECT y UPDATE que tenía el patrón anterior).
  // Si el saldo es insuficiente, el monto real adeudado queda en metadata.feeOwed.
  // Autocrea el wallet si el proveedor/comercio/conductor aún no tiene uno.
  async chargePlatformFee(userId: string, amount: number, reference: string, metadata: Record<string, unknown>) {
    this.assertPositiveAmount(amount);
    const wallet = await this.ensureWalletForUser(userId);

    return this.prisma.$transaction(async (tx) => {
      // CTE captures balance BEFORE the update so prev_balance is always correct
      const [row] = await tx.$queryRaw<{ new_balance: number; prev_balance: number }[]>`
        WITH prev AS (SELECT balance FROM "Wallet" WHERE id = ${wallet.id})
        UPDATE "Wallet"
        SET balance = GREATEST(balance - ${amount}::numeric, 0),
            "updatedAt" = NOW()
        WHERE id = ${wallet.id}
        RETURNING balance AS new_balance, (SELECT balance FROM prev) AS prev_balance
      `;

      const actualCharged = Math.min(amount, Number(row.prev_balance));
      const unpaid = amount - actualCharged;

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id, userId,
          type: WalletTransactionType.DEBIT,
          status: WalletTransactionStatus.COMPLETED,
          amount: actualCharged,
          balanceAfter: row.new_balance,
          description: 'Comisión de plataforma',
          reference,
          metadata: { ...metadata, feeOwed: amount, unpaidAmount: unpaid > 0 ? unpaid : undefined } as any,
        },
      });

      return { wallet: { ...wallet, balance: row.new_balance }, transaction };
    });
  }

  async adjust(targetUserId: string, actorId: string, actorRole: Role, dto: AdjustDto) {
    this.assertAdmin(actorRole);
    const { wallet } = await this.getActiveWallet(targetUserId);
    this.assertPositiveAmount(dto.amount);

    const isCredit  = dto.type === WalletTransactionType.CREDIT;
    const newBalance = isCredit ? wallet.balance + dto.amount : wallet.balance - dto.amount;

    if (newBalance < 0) throw new BadRequestException('El ajuste dejaría el saldo en negativo');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id, userId: targetUserId,
          type: WalletTransactionType.ADJUSTMENT,
          status: WalletTransactionStatus.COMPLETED,
          amount: dto.amount, balanceAfter: newBalance,
          description: dto.description ?? `Ajuste manual por admin`,
          metadata: { adminId: actorId, ...dto.metadata },
        },
      });
      return { wallet: updated, transaction };
    });
  }

  // ─── Transactions list ────────────────────────────────────────────────────────

  async listCurrentUserTransactions(userId: string, query: QueryWalletTransactionsDto) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Billetera no encontrada');
    return this.listTransactions(wallet.id, userId, query);
  }

  async listUserTransactions(targetUserId: string, actorRole: Role, query: QueryWalletTransactionsDto) {
    this.assertAdmin(actorRole);
    const wallet = await this.prisma.wallet.findUnique({ where: { userId: targetUserId } });
    if (!wallet) throw new NotFoundException('Billetera no encontrada');
    return this.listTransactions(wallet.id, targetUserId, query);
  }

  private async listTransactions(walletId: string, userId: string, query: QueryWalletTransactionsDto) {
    const page  = Math.max(1, parseInt(query.page ?? '1'));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '20')));
    const skip  = (page - 1) * limit;
    const where: { walletId: string; userId: string; type?: WalletTransactionType } = { walletId, userId };
    if (query.type) where.type = query.type;

    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.walletTransaction.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Idempotency ──────────────────────────────────────────────────────────────

  private idempotentKey(key: string, userId: string, op: string) {
    return `wallet:idempotent:${op}:${userId}:${key}`;
  }

  private async getIdempotent(key: string, userId: string, op: string): Promise<any | null> {
    const raw = await this.redis.get(this.idempotentKey(key, userId, op));
    return raw ? JSON.parse(raw) : null;
  }

  private async setIdempotent(key: string, userId: string, op: string, result: any) {
    await this.redis.setex(
      this.idempotentKey(key, userId, op),
      IDEMPOTENCY_TTL,
      JSON.stringify(result),
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async getActiveWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Billetera no encontrada. Crea una primero.');
    if (wallet.frozenAt) throw new BadRequestException('La billetera está congelada por el administrador.');
    if (wallet.status === 'SUSPENDED') throw new BadRequestException('La billetera está suspendida.');
    if (wallet.status === 'CLOSED')    throw new BadRequestException('La billetera está cerrada.');
    return { wallet };
  }

  private walletInclude() {
    return {
      user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      _count: { select: { transactions: true } },
    };
  }

  private normalizeCurrency(currency: string) {
    const normalized = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new BadRequestException('La moneda debe usar código ISO de 3 letras');
    }
    return normalized;
  }

  private assertAdmin(role: Role) {
    if (!ADMIN_ROLES.includes(role)) {
      throw new ForbiddenException('No tienes permisos para gestionar billeteras de otros usuarios');
    }
  }

  private assertPositiveAmount(amount: number) {
    if (!amount || amount <= 0) throw new BadRequestException('El monto debe ser mayor a cero');
  }

  private assertSufficientFunds(balance: number, amount: number) {
    if (balance < amount) throw new BadRequestException('Saldo insuficiente');
  }
}
