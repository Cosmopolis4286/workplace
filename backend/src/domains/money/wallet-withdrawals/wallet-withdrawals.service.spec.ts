import { ConflictException } from '@nestjs/common';
import { Prisma, WithdrawalStatus } from '@prisma/client';
import { WalletWithdrawalsService } from './wallet-withdrawals.service';

const D = (v: string | number) => new Prisma.Decimal(v);

const PAGO_MOVIL = {
  method: 'PAGO_MOVIL',
  currency: 'VES',
  bankCode: '0191',
  bankName: 'BNC',
  holderName: 'Ana Pérez',
  holderDocument: 'V-12345678',
  phone: '04141234567',
  accountNumber: null,
  email: null,
};

describe('WalletWithdrawalsService', () => {
  let prisma: any;
  let wallets: any;
  let accounts: any;
  let notifications: any;
  let rates: any;
  let service: WalletWithdrawalsService;

  beforeEach(() => {
    prisma = {
      walletWithdrawalRequest: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(({ data }) => Promise.resolve({ ...data })),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
      sellerPaymentAccount: {
        findFirst: jest.fn().mockResolvedValue({ id: 'acc-1', ...PAGO_MOVIL }),
      },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ role: 'CLIENT' }),
      },
    };
    wallets = {
      withdraw: jest.fn().mockResolvedValue({}),
      deposit: jest.fn().mockResolvedValue({}),
    };
    accounts = { normalize: jest.fn((dto) => ({ ...PAGO_MOVIL, ...dto })) };
    notifications = { createForUser: jest.fn().mockResolvedValue({}) };
    rates = {
      resolveRateToUsd: jest.fn().mockResolvedValue({ rateToUsd: D('40') }),
    };
    service = new WalletWithdrawalsService(
      prisma,
      wallets,
      accounts,
      notifications,
      rates
    );
  });

  it('debita el saldo y guarda el monto a transferir en la moneda de la cuenta', async () => {
    const res = await service.create('u1', 'CLIENT' as any, {
      amount: 25,
      pin: '123456',
      accountId: 'acc-1',
    });

    expect(wallets.withdraw).toHaveBeenCalledWith(
      'u1',
      'CLIENT',
      expect.objectContaining({
        amount: 25,
        pin: '123456',
        reference: `WITHDRAWAL-${res.id}`,
      })
    );
    expect(res.payoutCurrency).toBe('VES');
    expect(res.payoutAmount).toEqual(D('1000'));
    expect(res.destination).toMatchObject({ phone: '04141234567' });
  });

  it('no permite un segundo retiro mientras otro está en proceso', async () => {
    prisma.walletWithdrawalRequest.count.mockResolvedValue(1);
    await expect(
      service.create('u1', 'CLIENT' as any, {
        amount: 10,
        pin: '123456',
        accountId: 'acc-1',
      })
    ).rejects.toBeInstanceOf(ConflictException);
    expect(wallets.withdraw).not.toHaveBeenCalled();
  });

  it('devuelve el saldo si no se pudo registrar la solicitud', async () => {
    prisma.walletWithdrawalRequest.create.mockRejectedValue(new Error('db'));
    await expect(
      service.create('u1', 'CLIENT' as any, {
        amount: 10,
        pin: '123456',
        accountId: 'acc-1',
      })
    ).rejects.toBeInstanceOf(ConflictException);
    expect(wallets.deposit).toHaveBeenCalledWith(
      'u1',
      'CLIENT',
      expect.objectContaining({ amount: 10 }),
      { retryEscrows: false }
    );
  });

  it('al rechazar devuelve el monto a la billetera', async () => {
    prisma.walletWithdrawalRequest.findUnique.mockResolvedValue({
      id: 'w1',
      userId: 'u1',
      amount: D('25'),
      status: WithdrawalStatus.PENDING,
    });
    await service.reject('admin', 'w1', 'Cuenta no válida');
    expect(prisma.walletWithdrawalRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'w1', status: WithdrawalStatus.PENDING },
      })
    );
    expect(wallets.deposit).toHaveBeenCalledWith(
      'u1',
      'CLIENT',
      expect.objectContaining({
        amount: 25,
        reference: 'WITHDRAWAL-REFUND-w1',
      }),
      { retryEscrows: false }
    );
  });

  it('si la devolución falla el retiro vuelve a quedar pendiente', async () => {
    prisma.walletWithdrawalRequest.findUnique.mockResolvedValue({
      id: 'w1',
      userId: 'u1',
      amount: D('25'),
      status: WithdrawalStatus.PENDING,
    });
    wallets.deposit.mockRejectedValue(new Error('congelada'));
    await expect(
      service.reject('admin', 'w1', 'Cuenta no válida')
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.walletWithdrawalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: WithdrawalStatus.PENDING }),
      })
    );
  });

  it('marca pagado con la referencia normalizada', async () => {
    prisma.walletWithdrawalRequest.findUnique.mockResolvedValue({
      id: 'w1',
      userId: 'u1',
      amount: D('25'),
      payoutAmount: D('1000'),
      payoutCurrency: 'VES',
      status: WithdrawalStatus.PENDING,
    });
    await service.markPaid('admin', 'w1', ' 0012 3456 ');
    expect(prisma.walletWithdrawalRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: WithdrawalStatus.PAID,
          payoutReference: '00123456',
        }),
      })
    );
    expect(wallets.deposit).not.toHaveBeenCalled();
  });
});
