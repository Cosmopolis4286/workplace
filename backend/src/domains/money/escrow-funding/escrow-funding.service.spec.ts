import { ConflictException } from '@nestjs/common';
import { ManualPaymentReportStatus, Prisma } from '@prisma/client';
import { EscrowFundingService } from './escrow-funding.service';

const D = (v: string | number) => new Prisma.Decimal(v);

const PLATFORM_ACCOUNT = {
  id: 'pa-1',
  method: 'ZELLE',
  currency: 'USD',
  bankCode: null,
  bankName: null,
  holderName: 'WorkPlace LLC',
  holderDocument: 'J-123456789',
  phone: null,
  accountNumber: null,
  email: 'pagos@workplace.test',
};

describe('EscrowFundingService', () => {
  let prisma: any;
  let wallets: any;
  let notifications: any;
  let services: any;
  let rates: any;
  let service: EscrowFundingService;

  beforeEach(() => {
    prisma = {
      serviceRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'sr-1',
          requesterId: 'client',
          escrowStatus: 'PENDING_FUNDS',
          escrowAmount: D('50'),
          serviceName: 'Plomería',
          providerName: 'Luis',
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      serviceRequestPriceChangeProposal: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      wallet: {
        findUnique: jest.fn().mockResolvedValue({ balance: D('10') }),
      },
      escrowFundingReport: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(({ data }) => Promise.resolve({ id: 'r1', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
      platformCollectionAccount: {
        findFirst: jest.fn().mockResolvedValue(PLATFORM_ACCOUNT),
        findMany: jest.fn().mockResolvedValue([PLATFORM_ACCOUNT]),
      },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ role: 'CLIENT' }),
      },
    };
    wallets = {
      ensureWalletForUser: jest.fn().mockResolvedValue({}),
      deposit: jest.fn().mockResolvedValue({}),
    };
    notifications = { createForUser: jest.fn().mockResolvedValue({}) };
    services = {
      retryPendingEscrowForRequest: jest.fn().mockResolvedValue(true),
    };
    rates = { resolveRateToUsd: jest.fn() };
    service = new EscrowFundingService(
      prisma,
      wallets,
      notifications,
      services,
      rates
    );
  });

  const report = () =>
    service.reportServiceRequestPayment('client', 'sr-1', {
      platformAccountId: 'pa-1',
      reference: 'zl 998877',
      paidAt: new Date().toISOString(),
    });

  it('cobra solo lo que falta después del saldo de la billetera', async () => {
    const res = await report();
    expect(res.amount).toEqual(D('40'));
    expect(res.paidAmount).toEqual(D('40'));
    expect(res.reference).toBe('ZL998877');
    expect(res.sourceId).toBe('sr-1');
  });

  it('para un aumento aprobado sin fondos cobra solo el delta', async () => {
    prisma.serviceRequestPriceChangeProposal.findFirst.mockResolvedValue({
      deltaAmount: D('15'),
    });
    prisma.wallet.findUnique.mockResolvedValue(null);
    const res = await report();
    expect(res.amount).toEqual(D('15'));
  });

  it('rechaza un segundo reporte mientras hay uno en revisión', async () => {
    prisma.escrowFundingReport.findFirst.mockResolvedValueOnce({ id: 'r0' });
    await expect(report()).rejects.toBeInstanceOf(ConflictException);
  });

  it('solo el cliente de la solicitud puede pagarla', async () => {
    await expect(
      service.reportServiceRequestPayment('otro', 'sr-1', {
        platformAccountId: 'pa-1',
        reference: 'ZL998877',
        paidAt: new Date().toISOString(),
      })
    ).rejects.toThrow('Solicitud no encontrada');
  });

  it('al confirmar acredita sin disparar el reintento general y retiene esa solicitud', async () => {
    prisma.escrowFundingReport.findUnique.mockResolvedValue({
      id: 'r1',
      sourceId: 'sr-1',
      payerUserId: 'client',
      amount: D('40'),
      reference: 'ZL998877',
      status: ManualPaymentReportStatus.SUBMITTED,
    });
    const res = await service.confirm('admin', 'r1');
    expect(wallets.deposit).toHaveBeenCalledWith(
      'client',
      'CLIENT',
      expect.objectContaining({ amount: 40, reference: 'ESCROW-FUND-r1' }),
      { retryEscrows: false }
    );
    expect(services.retryPendingEscrowForRequest).toHaveBeenCalledWith('sr-1');
    expect(res).toEqual({ confirmed: true, held: true });
  });

  it('si no se pudo acreditar, el reporte vuelve a revisión', async () => {
    prisma.escrowFundingReport.findUnique.mockResolvedValue({
      id: 'r1',
      sourceId: 'sr-1',
      payerUserId: 'client',
      amount: D('40'),
      reference: 'ZL998877',
      status: ManualPaymentReportStatus.SUBMITTED,
    });
    wallets.deposit.mockRejectedValue(new Error('límite'));
    await expect(service.confirm('admin', 'r1')).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(prisma.escrowFundingReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ManualPaymentReportStatus.SUBMITTED,
        }),
      })
    );
    expect(services.retryPendingEscrowForRequest).not.toHaveBeenCalled();
  });

  it('si el saldo ya alcanza, retiene sin pedir pago', async () => {
    prisma.wallet.findUnique.mockResolvedValue({ balance: D('60') });
    const res = await service.getServiceRequestOptions('client', 'sr-1');
    expect(res.held).toBe(true);
    expect(services.retryPendingEscrowForRequest).toHaveBeenCalledWith('sr-1');
  });

  it('con Pago Protegido apagado no acepta pagos de garantía', async () => {
    delete process.env.PROTECTED_PAYMENTS_ENABLED;
    try {
      await expect(report()).rejects.toThrow('no está disponible');
      expect(prisma.escrowFundingReport.create).not.toHaveBeenCalled();
    } finally {
      process.env.PROTECTED_PAYMENTS_ENABLED = 'true';
    }
  });
});
