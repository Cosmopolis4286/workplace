import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  ExternalPaymentProvider,
  ExternalPaymentStatus,
  ExternalSettlementMode,
  ManualPaymentReportStatus,
  Prisma,
} from '@prisma/client';
import { ManualPaymentsService } from './manual-payments.service';

const D = (v: string | number) => new Prisma.Decimal(v);

describe('ManualPaymentsService', () => {
  let prisma: any;
  let tx: any;
  let payments: any;
  let sources: any;
  let accounts: any;
  let notifications: any;
  let rates: any;
  let service: ManualPaymentsService;

  const vesAccount = {
    id: 'acc-ves',
    userId: 'seller-1',
    method: 'PAGO_MOVIL',
    currency: 'VES',
    bankCode: '0191',
    bankName: 'BNC',
    holderName: 'Carlos Delivery',
    holderDocument: 'V-12345678',
    phone: '04141234567',
    accountNumber: null,
    email: null,
    isActive: true,
  };

  const intent = (over: Record<string, unknown> = {}) => ({
    id: 'intent-1',
    provider: ExternalPaymentProvider.MANUAL,
    sourceType: 'SERVICE_REQUEST',
    sourceId: 'sr-1',
    payerUserId: 'buyer-1',
    sellerUserId: 'seller-1',
    currency: 'USD',
    baseAmount: D('10.00'),
    amount: D('10.00'),
    status: ExternalPaymentStatus.REQUIRES_ACTION,
    ...over,
  });

  beforeEach(() => {
    tx = {
      manualPaymentReport: {
        create: jest.fn().mockResolvedValue({ id: 'rep-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma = {
      externalPaymentIntent: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(intent()),
      },
      manualPaymentReport: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'rep-1' }),
      },
      sellerPaymentAccount: {
        findFirst: jest.fn().mockResolvedValue(vesAccount),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    payments = {
      prepareIntent: jest
        .fn()
        .mockResolvedValue(intent({ status: ExternalPaymentStatus.DRAFT })),
      transitionIntent: jest.fn(async (id, status, _p, _c, _m, after) => {
        if (after) await after(tx);
        return intent({ id, status });
      }),
    };
    sources = {
      resolve: jest.fn().mockResolvedValue({
        sourceType: 'SERVICE_REQUEST',
        sourceId: 'sr-1',
        payerUserId: 'buyer-1',
        sellerUserId: 'seller-1',
        currency: 'USD',
        baseAmount: '10.00',
        description: 'Servicio - Delivery',
      }),
    };
    accounts = {
      listActiveForSeller: jest.fn().mockResolvedValue([vesAccount]),
    };
    notifications = { createForUser: jest.fn().mockResolvedValue({}) };
    rates = {
      resolveRateToUsd: jest
        .fn()
        .mockResolvedValue({ rateToUsd: D('36.5'), source: 'BCV' }),
    };
    service = new ManualPaymentsService(
      prisma,
      payments,
      sources,
      accounts,
      notifications,
      rates
    );
  });

  describe('start', () => {
    it('no crea el pago si el vendedor no tiene cuentas de cobro', async () => {
      accounts.listActiveForSeller.mockResolvedValue([]);
      await expect(
        service.start('buyer-1', 'SERVICE_REQUEST', 'sr-1')
      ).rejects.toThrow('no configuró cuentas');
      expect(payments.prepareIntent).not.toHaveBeenCalled();
    });

    it('crea un pago directo al vendedor, sin comisión, y lo deja esperando el pago', async () => {
      const result = await service.start('buyer-1', 'SERVICE_REQUEST', 'sr-1');
      expect(payments.prepareIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: ExternalPaymentProvider.MANUAL,
          settlementMode: ExternalSettlementMode.DIRECT_TO_SELLER,
          commissionRateBps: 0,
          baseAmount: '10.00',
          idempotencyKey: 'manual:SERVICE_REQUEST:sr-1:0',
        })
      );
      expect(payments.transitionIntent).toHaveBeenCalledWith(
        'intent-1',
        ExternalPaymentStatus.REQUIRES_ACTION
      );
      // $10 a 36.5 Bs/USD → Bs. 365.00 en la cuenta de pago móvil
      expect(result.accounts[0].amount!.toFixed(2)).toBe('365.00');
    });

    it('si el precio cambió antes de reportar, cancela el pago viejo y crea uno nuevo', async () => {
      prisma.externalPaymentIntent.findMany.mockResolvedValue([
        intent({ id: 'old', baseAmount: D('8.00'), amount: D('8.00') }),
      ]);
      await service.start('buyer-1', 'SERVICE_REQUEST', 'sr-1');
      expect(payments.transitionIntent).toHaveBeenCalledWith(
        'old',
        ExternalPaymentStatus.CANCELLED,
        'QUOTE_CHANGED'
      );
      expect(payments.prepareIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: 'manual:SERVICE_REQUEST:sr-1:1',
        })
      );
    });

    it('un pago ya reportado no se reemplaza aunque cambie el precio', async () => {
      prisma.externalPaymentIntent.findMany.mockResolvedValue([
        intent({
          status: ExternalPaymentStatus.PROCESSING,
          baseAmount: D('8.00'),
        }),
      ]);
      const result = await service.start('buyer-1', 'SERVICE_REQUEST', 'sr-1');
      expect(payments.prepareIntent).not.toHaveBeenCalled();
      expect(result.priceChanged).toBe(true);
    });
  });

  describe('report', () => {
    const dto = {
      sellerPaymentAccountId: 'acc-ves',
      reference: ' 0012 3456 ',
      paidAt: new Date().toISOString(),
    };

    it('registra el reporte con el monto y la tasa del servidor y avisa al vendedor', async () => {
      await service.report('buyer-1', 'intent-1', dto);
      expect(payments.transitionIntent).toHaveBeenCalledWith(
        'intent-1',
        ExternalPaymentStatus.PROCESSING,
        'MANUAL_REPORTED',
        undefined,
        undefined,
        expect.any(Function)
      );
      const data = tx.manualPaymentReport.create.mock.calls[0][0].data;
      expect(data.reference).toBe('00123456');
      expect(data.paidCurrency).toBe('VES');
      expect(data.paidAmount.toFixed(2)).toBe('365.00');
      expect(data.exchangeRate.toString()).toBe('36.5');
      expect(notifications.createForUser).toHaveBeenCalledWith(
        'seller-1',
        expect.objectContaining({ link: '/payments/incoming' })
      );
    });

    it('rechaza una referencia ya usada con el mismo vendedor', async () => {
      prisma.manualPaymentReport.findFirst.mockResolvedValue({ id: 'other' });
      await expect(service.report('buyer-1', 'intent-1', dto)).rejects.toThrow(
        'Esa referencia ya fue reportada'
      );
      expect(payments.transitionIntent).not.toHaveBeenCalled();
    });

    it('solo el comprador del pago puede reportarlo', async () => {
      await expect(
        service.report('intruso', 'intent-1', dto)
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('no admite fechas futuras', async () => {
      const future = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
      await expect(
        service.report('buyer-1', 'intent-1', { ...dto, paidAt: future })
      ).rejects.toThrow('no puede ser futura');
    });

    it('no admite un segundo reporte mientras el primero espera confirmación', async () => {
      prisma.externalPaymentIntent.findUnique.mockResolvedValue(
        intent({ status: ExternalPaymentStatus.PROCESSING })
      );
      await expect(
        service.report('buyer-1', 'intent-1', dto)
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('confirm / reject', () => {
    const submitted = {
      id: 'rep-1',
      paymentIntentId: 'intent-1',
      sellerUserId: 'seller-1',
      payerUserId: 'buyer-1',
      reference: '00123456',
      status: ManualPaymentReportStatus.SUBMITTED,
    };

    it('confirmar marca el pago como exitoso y el reporte como confirmado', async () => {
      prisma.manualPaymentReport.findUnique.mockResolvedValue(submitted);
      await service.confirm('seller-1', 'rep-1');
      expect(payments.transitionIntent.mock.calls[0][1]).toBe(
        ExternalPaymentStatus.SUCCEEDED
      );
      expect(tx.manualPaymentReport.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rep-1', status: ManualPaymentReportStatus.SUBMITTED },
          data: expect.objectContaining({
            status: ManualPaymentReportStatus.CONFIRMED,
          }),
        })
      );
      expect(notifications.createForUser).toHaveBeenCalledWith(
        'buyer-1',
        expect.objectContaining({ link: '/service-requests' })
      );
    });

    it('otro vendedor no puede confirmar el reporte', async () => {
      prisma.manualPaymentReport.findUnique.mockResolvedValue(submitted);
      await expect(service.confirm('seller-2', 'rep-1')).rejects.toThrow(
        'no encontrado'
      );
    });

    it('rechazar deja el pago listo para un nuevo reporte y exige motivo', async () => {
      prisma.manualPaymentReport.findUnique.mockResolvedValue(submitted);
      await expect(service.reject('seller-1', 'rep-1', ' ')).rejects.toThrow(
        'por qué'
      );
      await service.reject('seller-1', 'rep-1', 'No aparece en mi cuenta');
      expect(payments.transitionIntent.mock.calls[0][1]).toBe(
        ExternalPaymentStatus.REQUIRES_RECONCILIATION
      );
    });

    it('un reporte revisado en paralelo no se revisa dos veces', async () => {
      prisma.manualPaymentReport.findUnique.mockResolvedValue(submitted);
      tx.manualPaymentReport.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.confirm('seller-1', 'rep-1')).rejects.toThrow(
        'ya fue revisado'
      );
    });
  });
});
