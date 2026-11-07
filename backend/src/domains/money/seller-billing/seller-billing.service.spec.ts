import {
  ManualPaymentReportStatus,
  Prisma,
  SellerChargeStatus,
  SellerStatementStatus,
} from '@prisma/client';
import { SellerBillingService, weekStart } from './seller-billing.service';

const D = (v: string | number) => new Prisma.Decimal(v);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('SellerBillingService', () => {
  let prisma: any;
  let notifications: any;
  let rates: any;
  let service: SellerBillingService;

  beforeEach(() => {
    prisma = {
      sellerCommissionCharge: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(({ data }) => Promise.resolve({ id: 'ch-1', ...data })),
        groupBy: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { amount: D('12.50') } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      sellerStatement: {
        findUnique: jest.fn().mockResolvedValue(null),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(({ data }) => Promise.resolve({ id: 'st-1', ...data })),
        update: jest.fn(({ where, data }) =>
          Promise.resolve({
            id: where.id,
            totalAmount: D('12.50'),
            pausedServiceIds: [],
            pausedProductIds: [],
            dueAt: new Date(),
            ...data,
          })
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      sellerStatementPayment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn(({ data }) =>
          Promise.resolve({ id: 'pay-1', ...data })
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      platformCollectionAccount: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'pa-1',
          method: 'PAGO_MOVIL',
          currency: 'VES',
          bankCode: '0191',
          bankName: 'BNC',
          holderName: 'WorkPlace C.A.',
          holderDocument: 'J-123456789',
          phone: '04141234567',
          accountNumber: null,
          email: null,
        }),
      },
      service: {
        findMany: jest.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([{ id: 'p1' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      commerce: { findUnique: jest.fn().mockResolvedValue({ id: 'com-1' }) },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    notifications = { createForUser: jest.fn().mockResolvedValue({}) };
    rates = {
      resolveRateToUsd: jest
        .fn()
        .mockResolvedValue({ rateToUsd: D('40'), source: 'BCV' }),
    };
    service = new SellerBillingService(prisma, notifications, {} as any, rates);
  });

  describe('weekStart', () => {
    it('es el lunes 00:00 de Caracas (04:00 UTC)', () => {
      expect(weekStart(new Date('2026-10-28T15:00:00Z')).toISOString()).toBe(
        '2026-10-26T04:00:00.000Z'
      );
    });

    it('el domingo 23:30 en Caracas todavía pertenece a la semana anterior', () => {
      // Lunes 03:30 UTC = domingo 23:30 en Caracas
      expect(weekStart(new Date('2026-11-02T03:30:00Z')).toISOString()).toBe(
        '2026-10-26T04:00:00.000Z'
      );
    });
  });

  describe('recordCharge', () => {
    const input = {
      type: 'ORDER' as const,
      sellerUserId: 'seller-1',
      amount: 4.5,
      reference: 'FEE-ORDER-1',
    };

    it('crea un cargo pendiente y avisa al vendedor', async () => {
      const charge = await service.recordCharge(input);
      expect(charge!.status).toBe(SellerChargeStatus.PENDING);
      expect(notifications.createForUser).toHaveBeenCalledWith(
        'seller-1',
        expect.objectContaining({ link: '/billing' })
      );
    });

    it('es idempotente por referencia: un reintento no cobra dos veces', async () => {
      prisma.sellerCommissionCharge.findUnique.mockResolvedValue({ id: 'old' });
      await expect(service.recordCharge(input)).resolves.toEqual({ id: 'old' });
      expect(prisma.sellerCommissionCharge.create).not.toHaveBeenCalled();
      expect(notifications.createForUser).not.toHaveBeenCalled();
    });

    it('la comisión retenida de una garantía queda como cobrada', async () => {
      const charge = await service.recordCharge({ ...input, collected: true });
      expect(charge!.status).toBe(SellerChargeStatus.COLLECTED);
    });

    it('usa el TransactionClient proporcionado y difiere la notificación al commit', async () => {
      const tx = {
        sellerCommissionCharge: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(({ data }) =>
            Promise.resolve({ id: 'tx-charge', ...data })
          ),
        },
      } as any;

      const charge = await service.recordCharge(input, tx);

      expect(charge!.id).toBe('tx-charge');
      expect(tx.sellerCommissionCharge.findUnique).toHaveBeenCalledWith({
        where: { reference: input.reference },
      });
      expect(tx.sellerCommissionCharge.create).toHaveBeenCalled();
      expect(prisma.sellerCommissionCharge.findUnique).not.toHaveBeenCalled();
      expect(prisma.sellerCommissionCharge.create).not.toHaveBeenCalled();
      expect(notifications.createForUser).not.toHaveBeenCalled();
    });

    it('permite notificar un cargo transaccional explícitamente después del commit', async () => {
      await service.notifyChargeRecorded(input);

      expect(notifications.createForUser).toHaveBeenCalledWith(
        'seller-1',
        expect.objectContaining({
          title: '🧾 Comisión registrada',
          link: '/billing',
        })
      );
    });

    it('no crea ni notifica cargos de importe cero o negativo', async () => {
      await expect(
        service.recordCharge({ ...input, amount: 0 })
      ).resolves.toBeNull();
      await expect(
        service.recordCharge({ ...input, amount: -1 })
      ).resolves.toBeNull();
      expect(prisma.sellerCommissionCharge.create).not.toHaveBeenCalled();
      expect(notifications.createForUser).not.toHaveBeenCalled();
    });
  });

  describe('issueStatements', () => {
    const now = new Date('2026-11-02T04:10:00Z'); // lunes 00:10 Caracas

    it('agrupa los cargos de la semana en un estado de cuenta que vence a los 5 días', async () => {
      prisma.sellerCommissionCharge.groupBy.mockResolvedValue([
        { sellerUserId: 'seller-1' },
      ]);
      await expect(service.issueStatements(now)).resolves.toEqual({
        issued: 1,
      });

      const data = prisma.sellerStatement.create.mock.calls[0][0].data;
      expect(data.periodStart.toISOString()).toBe('2026-10-26T04:00:00.000Z');
      expect(data.periodEnd.toISOString()).toBe('2026-11-02T04:00:00.000Z');
      expect(data.dueAt.getTime() - now.getTime()).toBe(5 * DAY);
      expect(prisma.sellerCommissionCharge.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            statementId: null,
            createdAt: { lt: data.periodEnd },
          }),
        })
      );
      expect(
        prisma.sellerStatement.update.mock.calls[0][0].data.totalAmount
      ).toEqual(D('12.50'));
    });

    it('no emite dos veces el mismo período', async () => {
      prisma.sellerCommissionCharge.groupBy.mockResolvedValue([
        { sellerUserId: 'seller-1' },
      ]);
      prisma.sellerStatement.findUnique.mockResolvedValue({ id: 'st-old' });
      await expect(service.issueStatements(now)).resolves.toEqual({
        issued: 0,
      });
      expect(prisma.sellerStatement.create).not.toHaveBeenCalled();
    });
  });

  describe('enforceDeadlines', () => {
    const now = new Date('2026-11-10T12:00:00Z');

    it('un estado vencido pasa a OVERDUE y se avisa', async () => {
      prisma.sellerStatement.findMany
        .mockResolvedValueOnce([
          { id: 'st-1', sellerUserId: 'seller-1', totalAmount: D('12.50') },
        ])
        .mockResolvedValueOnce([]);
      await expect(service.enforceDeadlines(now)).resolves.toEqual({
        overdue: 1,
        suspended: 0,
      });
      expect(prisma.sellerStatement.updateMany).toHaveBeenCalledWith({
        where: { id: 'st-1', status: SellerStatementStatus.ISSUED },
        data: { status: SellerStatementStatus.OVERDUE, overdueAt: now },
      });
    });

    it('48 h después del vencimiento pausa servicios y productos y guarda qué pausó', async () => {
      prisma.sellerStatement.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'st-1', sellerUserId: 'seller-1' }]);
      await service.enforceDeadlines(now);

      const graceQuery = prisma.sellerStatement.findMany.mock.calls[1][0].where;
      expect(now.getTime() - graceQuery.dueAt.lt.getTime()).toBe(48 * HOUR);
      expect(prisma.service.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['s1', 's2'] } },
        data: { status: 'PAUSED' },
      });
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['p1'] } },
        data: { forSale: false },
      });
      expect(prisma.sellerStatement.update).toHaveBeenCalledWith({
        where: { id: 'st-1' },
        data: { pausedServiceIds: ['s1', 's2'], pausedProductIds: ['p1'] },
      });
    });
  });

  describe('pago del estado de cuenta', () => {
    const statement = {
      id: 'st-1',
      sellerUserId: 'seller-1',
      currency: 'USD',
      totalAmount: D('12.50'),
      status: SellerStatementStatus.OVERDUE,
      dueAt: new Date(Date.now() - DAY),
      suspendedAt: null,
      overdueAt: new Date(),
    };
    const dto = {
      platformAccountId: 'pa-1',
      reference: '987654',
      paidAt: new Date().toISOString(),
    };

    it('reportar convierte a Bs. con la tasa del servidor y congela la escalada', async () => {
      prisma.sellerStatement.findUnique.mockResolvedValue(statement);
      const payment = await service.reportPayment('seller-1', 'st-1', dto);
      expect(payment.paidAmount.toFixed(2)).toBe('500.00');
      expect(prisma.sellerStatement.updateMany.mock.calls[0][0].data).toEqual({
        status: SellerStatementStatus.PAYMENT_REPORTED,
      });
    });

    it('una referencia ya reportada no se acepta de nuevo', async () => {
      prisma.sellerStatement.findUnique.mockResolvedValue(statement);
      prisma.sellerStatementPayment.findFirst.mockResolvedValue({ id: 'x' });
      await expect(
        service.reportPayment('seller-1', 'st-1', dto)
      ).rejects.toThrow('ya fue reportada');
    });

    it('otro vendedor no puede pagar este estado de cuenta', async () => {
      prisma.sellerStatement.findUnique.mockResolvedValue(statement);
      await expect(
        service.reportPayment('intruso', 'st-1', dto)
      ).rejects.toThrow('no encontrado');
    });

    const submitted = {
      id: 'pay-1',
      statementId: 'st-1',
      sellerUserId: 'seller-1',
      reference: '987654',
      status: ManualPaymentReportStatus.SUBMITTED,
    };

    it('confirmar lo marca pagado y reactiva lo que la suspensión pausó', async () => {
      prisma.sellerStatementPayment.findUnique.mockResolvedValue(submitted);
      prisma.sellerStatement.update.mockImplementationOnce(({ data }: any) =>
        Promise.resolve({
          id: 'st-1',
          totalAmount: D('12.50'),
          pausedServiceIds: ['s1'],
          pausedProductIds: ['p1'],
          suspendedAt: new Date(),
          ...data,
        })
      );
      await service.confirmPayment('admin-1', 'pay-1');
      expect(prisma.service.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['s1'] }, status: 'PAUSED' },
        data: { status: 'ACTIVE' },
      });
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['p1'] }, forSale: false },
        data: { forSale: true },
      });
    });

    it('rechazar devuelve el estado de cuenta a SUSPENDED si ya estaba suspendido', async () => {
      prisma.sellerStatementPayment.findUnique.mockResolvedValue(submitted);
      prisma.sellerStatement.findUniqueOrThrow.mockResolvedValue({
        ...statement,
        suspendedAt: new Date(),
      });
      await service.rejectPayment('admin-1', 'pay-1', 'No aparece en el banco');
      expect(prisma.sellerStatement.update.mock.calls[0][0].data.status).toBe(
        SellerStatementStatus.SUSPENDED
      );
    });

    it('un pago ya revisado no se revisa dos veces', async () => {
      prisma.sellerStatementPayment.findUnique.mockResolvedValue({
        ...submitted,
        status: ManualPaymentReportStatus.CONFIRMED,
      });
      await expect(service.confirmPayment('admin-1', 'pay-1')).rejects.toThrow(
        'ya fue revisado'
      );
    });
  });
});
