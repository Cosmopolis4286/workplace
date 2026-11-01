import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { WalletsService } from '../../domains/money/wallets/wallets.service';
import { WalletWithdrawalsService } from '../../domains/money/wallets/wallet-withdrawals.service';

const USER_ID = 'user-1';
const ACCOUNT = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: USER_ID,
  isActive: true,
  method: 'PAGO_MOVIL',
  currency: 'VES',
  bankCode: '0102',
  bankName: 'Banco de Venezuela',
  holderName: 'Ana Pérez',
  holderDocument: 'V-12345678',
  phone: '04141234567',
  accountNumber: null,
  email: null,
};

describe('WalletsService.withdraw — crea una solicitud de retiro', () => {
  let prisma: any;
  let limits: any;
  let service: WalletsService;

  beforeEach(() => {
    prisma = {
      wallet: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'wallet-1',
          userId: USER_ID,
          balance: new Prisma.Decimal(100),
          currency: 'USD',
          status: 'ACTIVE',
          frozenAt: null,
        }),
      },
      sellerPaymentAccount: { findFirst: jest.fn().mockResolvedValue(ACCOUNT) },
      walletTransaction: {
        create: jest.fn(({ data }: any) => Promise.resolve({ id: 'tx-1', ...data })),
      },
      walletWithdrawalRequest: {
        create: jest.fn(({ data }: any) => Promise.resolve({ ...data, status: 'PENDING' })),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ new_balance: new Prisma.Decimal(60) }]),
      $transaction: jest.fn((cb: (tx: any) => unknown) => cb(prisma)),
    };
    limits = {
      assertSingleTxLimit: jest.fn(),
      assertDailyDebitLimit: jest.fn(),
      assertMonthlyDebitLimit: jest.fn(),
      recordDebit: jest.fn(),
    };
    const redis = { get: jest.fn(), setex: jest.fn() };
    const pin = { verifyPin: jest.fn().mockResolvedValue(undefined) };
    service = new WalletsService(prisma, redis as any, pin as any, limits, {} as any);
  });

  const dto = { amount: 40, pin: '123456', payoutAccountId: ACCOUNT.id };

  it('descuenta el saldo y deja la solicitud PENDING con la cuenta de destino copiada', async () => {
    const result: any = await service.withdraw(USER_ID, Role.NORMAL, dto as any);

    const request = prisma.walletWithdrawalRequest.create.mock.calls[0][0].data;
    expect(request).toMatchObject({
      userId: USER_ID,
      walletId: 'wallet-1',
      amount: 40,
      currency: 'USD',
      payoutAccountId: ACCOUNT.id,
      debitTransactionId: 'tx-1',
    });
    expect(request.destination).toMatchObject({
      method: 'PAGO_MOVIL',
      holderDocument: 'V-12345678',
      phone: '04141234567',
    });
    const debit = prisma.walletTransaction.create.mock.calls[0][0].data;
    expect(debit.type).toBe('DEBIT');
    expect(debit.reference).toBe(`WITHDRAWAL-${request.id}`);
    expect(result.withdrawal.status).toBe('PENDING');
    expect(limits.recordDebit).toHaveBeenCalledWith(USER_ID, 40);
  });

  it('rechaza sin una cuenta de cobro activa propia y no toca el saldo', async () => {
    prisma.sellerPaymentAccount.findFirst.mockResolvedValue(null);
    await expect(
      service.withdraw(USER_ID, Role.NORMAL, dto as any)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.sellerPaymentAccount.findFirst).toHaveBeenCalledWith({
      where: { id: ACCOUNT.id, userId: USER_ID, isActive: true },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('no crea la solicitud si el débito atómico no encuentra saldo', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(
      service.withdraw(USER_ID, Role.NORMAL, dto as any)
    ).rejects.toThrow('Saldo insuficiente');
    expect(prisma.walletWithdrawalRequest.create).not.toHaveBeenCalled();
  });
});

describe('WalletWithdrawalsService', () => {
  let prisma: any;
  let notifications: any;
  let service: WalletWithdrawalsService;
  const ID = 'wd-1';
  const pending = {
    id: ID,
    userId: USER_ID,
    walletId: 'wallet-1',
    amount: new Prisma.Decimal(40),
    currency: 'USD',
    status: 'PENDING',
  };

  beforeEach(() => {
    prisma = {
      walletWithdrawalRequest: {
        findUnique: jest.fn().mockResolvedValue(pending),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(({ data }: any) => Promise.resolve({ ...pending, ...data })),
      },
      walletTransaction: {
        create: jest.fn(({ data }: any) => Promise.resolve({ id: 'rev-1', ...data })),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ new_balance: new Prisma.Decimal(100) }]),
      $transaction: jest.fn((cb: (tx: any) => unknown) => cb(prisma)),
    };
    notifications = { createForUser: jest.fn().mockResolvedValue(undefined) };
    service = new WalletWithdrawalsService(prisma, notifications);
  });

  it('marca pagado con la referencia y avisa al usuario, sin mover saldo', async () => {
    await service.markPaid(ID, 'admin-1', '  REF123 ');
    expect(prisma.walletWithdrawalRequest.updateMany).toHaveBeenCalledWith({
      where: { id: ID, status: 'PENDING' },
      data: expect.objectContaining({
        status: 'PAID',
        payoutReference: 'REF123',
        reviewedById: 'admin-1',
      }),
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(notifications.createForUser).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ title: expect.stringContaining('pagado') })
    );
  });

  it('rechazar reintegra el monto con un crédito y enlaza la reversa', async () => {
    await service.reject(ID, 'admin-1', 'Cuenta inválida');
    const credit = prisma.walletTransaction.create.mock.calls[0][0].data;
    expect(credit).toMatchObject({
      type: 'CREDIT',
      amount: pending.amount,
      reference: `WITHDRAWAL-REVERSAL-${ID}`,
    });
    expect(prisma.walletWithdrawalRequest.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: { reversalTransactionId: 'rev-1' },
    });
  });

  it('si otro admin ya lo procesó (carrera), no reintegra dos veces', async () => {
    prisma.walletWithdrawalRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.reject(ID, 'admin-1', 'x motivo')).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
  });

  it('no procesa una solicitud ya cerrada', async () => {
    prisma.walletWithdrawalRequest.findUnique.mockResolvedValue({
      ...pending,
      status: 'PAID',
    });
    await expect(service.markPaid(ID, 'admin-1', 'REF1')).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(prisma.walletWithdrawalRequest.updateMany).not.toHaveBeenCalled();
  });
});
