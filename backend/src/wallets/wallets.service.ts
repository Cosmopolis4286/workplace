import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, WalletTransactionType, WalletTransactionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { QueryWalletTransactionsDto } from './dto/query-wallet-transactions.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransferDto } from './dto/transfer.dto';
import { PaymentDto } from './dto/payment.dto';
import { AdjustDto } from './dto/adjust.dto';

const ADMIN_ROLES: Role[] = [Role.SUPERADMIN, Role.ADMIN];

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureWalletForUser(userId: string, currency = 'USD') {
    const normalizedCurrency = this.normalizeCurrency(currency);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
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
    return wallet;
  }

  async getUserWallet(targetUserId: string, actorRole: Role) {
    this.assertAdmin(actorRole);
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: targetUserId },
      include: this.walletInclude(),
    });
    if (!wallet) throw new NotFoundException('Billetera no encontrada');
    return wallet;
  }

  async listWallets(actorRole: Role, page = 1, limit = 20) {
    this.assertAdmin(actorRole);

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.prisma.wallet.findMany({
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: this.walletInclude(),
      }),
      this.prisma.wallet.count(),
    ]);

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // ─── Financial Operations ───────────────────────────────────────────────────

  async deposit(userId: string, dto: DepositDto) {
    const { wallet } = await this.getActiveWallet(userId);
    this.assertPositiveAmount(dto.amount);

    const newBalance = wallet.balance + dto.amount;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: WalletTransactionType.CREDIT,
          status: WalletTransactionStatus.COMPLETED,
          amount: dto.amount,
          balanceAfter: newBalance,
          description: dto.description ?? 'Depósito',
          reference: dto.reference,
          metadata: dto.metadata,
        },
      });

      return { wallet: updated, transaction };
    });
  }

  async withdraw(userId: string, dto: WithdrawDto) {
    const { wallet } = await this.getActiveWallet(userId);
    this.assertPositiveAmount(dto.amount);
    this.assertSufficientFunds(wallet.balance, dto.amount);

    const newBalance = wallet.balance - dto.amount;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: WalletTransactionType.DEBIT,
          status: WalletTransactionStatus.COMPLETED,
          amount: dto.amount,
          balanceAfter: newBalance,
          description: dto.description ?? 'Retiro',
          reference: dto.reference,
          metadata: dto.metadata,
        },
      });

      return { wallet: updated, transaction };
    });
  }

  async transfer(senderId: string, dto: TransferDto) {
    if (dto.recipientUserId === senderId) {
      throw new BadRequestException('No puedes transferirte fondos a ti mismo');
    }
    this.assertPositiveAmount(dto.amount);

    const { wallet: senderWallet } = await this.getActiveWallet(senderId);
    this.assertSufficientFunds(senderWallet.balance, dto.amount);

    const recipientWallet = await this.prisma.wallet.findUnique({
      where: { userId: dto.recipientUserId },
    });
    if (!recipientWallet) throw new NotFoundException('La billetera del destinatario no existe');
    if (recipientWallet.status !== 'ACTIVE') {
      throw new BadRequestException('La billetera del destinatario no está activa');
    }

    const senderNewBalance = senderWallet.balance - dto.amount;
    const recipientNewBalance = recipientWallet.balance + dto.amount;
    const ref = `TRF-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      const [updatedSender, updatedRecipient] = await Promise.all([
        tx.wallet.update({ where: { id: senderWallet.id }, data: { balance: senderNewBalance } }),
        tx.wallet.update({ where: { id: recipientWallet.id }, data: { balance: recipientNewBalance } }),
      ]);

      const [debit, credit] = await Promise.all([
        tx.walletTransaction.create({
          data: {
            walletId: senderWallet.id,
            userId: senderId,
            type: WalletTransactionType.DEBIT,
            status: WalletTransactionStatus.COMPLETED,
            amount: dto.amount,
            balanceAfter: senderNewBalance,
            description: dto.description ?? `Transferencia enviada a ${dto.recipientUserId}`,
            reference: ref,
            metadata: { recipientUserId: dto.recipientUserId, ...dto.metadata },
          },
        }),
        tx.walletTransaction.create({
          data: {
            walletId: recipientWallet.id,
            userId: dto.recipientUserId,
            type: WalletTransactionType.CREDIT,
            status: WalletTransactionStatus.COMPLETED,
            amount: dto.amount,
            balanceAfter: recipientNewBalance,
            description: dto.description ?? `Transferencia recibida de ${senderId}`,
            reference: ref,
            metadata: { senderUserId: senderId, ...dto.metadata },
          },
        }),
      ]);

      return {
        reference: ref,
        sender: { wallet: updatedSender, transaction: debit },
        recipient: { wallet: updatedRecipient, transaction: credit },
      };
    });
  }

  async payment(userId: string, dto: PaymentDto) {
    const { wallet } = await this.getActiveWallet(userId);
    this.assertPositiveAmount(dto.amount);
    this.assertSufficientFunds(wallet.balance, dto.amount);

    const newBalance = wallet.balance - dto.amount;
    const ref = dto.orderId
      ? `PAY-ORDER-${dto.orderId}`
      : dto.serviceRequestId
        ? `PAY-SVC-${dto.serviceRequestId}`
        : `PAY-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: WalletTransactionType.DEBIT,
          status: WalletTransactionStatus.COMPLETED,
          amount: dto.amount,
          balanceAfter: newBalance,
          description: dto.description ?? 'Pago con billetera',
          reference: ref,
          metadata: {
            orderId: dto.orderId,
            serviceRequestId: dto.serviceRequestId,
            ...dto.metadata,
          },
        },
      });

      return { wallet: updated, transaction };
    });
  }

  async adjust(targetUserId: string, actorRole: Role, dto: AdjustDto) {
    this.assertAdmin(actorRole);
    const { wallet } = await this.getActiveWallet(targetUserId);
    this.assertPositiveAmount(dto.amount);

    const isCredit = dto.type === WalletTransactionType.CREDIT;
    const newBalance = isCredit ? wallet.balance + dto.amount : wallet.balance - dto.amount;

    if (newBalance < 0) {
      throw new BadRequestException('El ajuste dejaría el saldo en negativo');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: targetUserId,
          type: WalletTransactionType.ADJUSTMENT,
          status: WalletTransactionStatus.COMPLETED,
          amount: dto.amount,
          balanceAfter: newBalance,
          description: dto.description ?? 'Ajuste manual',
          metadata: dto.metadata,
        },
      });

      return { wallet: updated, transaction };
    });
  }

  // ─── Transactions list ──────────────────────────────────────────────────────

  async listCurrentUserTransactions(userId: string, query: QueryWalletTransactionsDto) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Billetera no encontrada');
    return this.listTransactions(wallet.id, userId, query);
  }

  async listUserTransactions(
    targetUserId: string,
    actorRole: Role,
    query: QueryWalletTransactionsDto,
  ) {
    this.assertAdmin(actorRole);
    const wallet = await this.prisma.wallet.findUnique({ where: { userId: targetUserId } });
    if (!wallet) throw new NotFoundException('Billetera no encontrada');
    return this.listTransactions(wallet.id, targetUserId, query);
  }

  private async listTransactions(
    walletId: string,
    userId: string,
    query: QueryWalletTransactionsDto,
  ) {
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '20')));
    const skip = (page - 1) * limit;

    const where: {
      walletId: string;
      userId: string;
      type?: WalletTransactionType;
    } = { walletId, userId };

    if (query.type) where.type = query.type;

    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getActiveWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Billetera no encontrada. Crea una primero.');
    if (wallet.status === 'SUSPENDED') throw new BadRequestException('La billetera está suspendida');
    if (wallet.status === 'CLOSED') throw new BadRequestException('La billetera está cerrada');
    return { wallet };
  }

  private walletInclude() {
    return {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
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
    if (!amount || amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }
  }

  private assertSufficientFunds(balance: number, amount: number) {
    if (balance < amount) {
      throw new BadRequestException('Saldo insuficiente');
    }
  }
}
