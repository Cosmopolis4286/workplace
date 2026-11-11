import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { CatalogService } from '../../domains/commerce-core/catalog/catalog.service';

const REQUESTER_ID = 'buyer-1';

function order(overrides: Partial<any> = {}) {
  return {
    id: 'order-1',
    commerceId: 'commerce-1',
    commerceName: 'Pastelería Ana',
    status: 'PENDING',
    requesterId: REQUESTER_ID,
    escrowStatus: 'HELD',
    escrowAmount: new Prisma.Decimal(30),
    totalEstimate: new Prisma.Decimal(30),
    platformFeeRate: null,
    platformFeeAmount: null,
    ...overrides,
  };
}

describe('CatalogService — cancelación, stock y plazos de garantía', () => {
  let prisma: any;
  let escrow: any;
  let notifications: any;
  let fees: any;
  let service: CatalogService;

  beforeEach(() => {
    prisma = {
      catalogOrder: {
        findUnique: jest.fn().mockResolvedValue(order()),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(({ data }: any) =>
          Promise.resolve({ ...order(), ...data })
        ),
      },
      report: { findMany: jest.fn().mockResolvedValue([]) },
      catalogOrderItem: {
        findMany: jest.fn().mockResolvedValue([
          { productId: 'p-cafe', quantity: 2, isBundle: false },
          { productId: 'pack-1', quantity: 1, isBundle: true },
        ]),
      },
      productBundleItem: {
        findMany: jest.fn().mockResolvedValue([
          {
            bundleProductId: 'pack-1',
            componentProductId: 'p-cafe',
            quantity: 1,
          },
          {
            bundleProductId: 'pack-1',
            componentProductId: 'p-torta',
            quantity: 3,
          },
        ]),
      },
      product: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({
          stock: 4,
          minStock: 2,
          status: ProductStatus.OUT_OF_STOCK,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      commerce: {
        findUnique: jest.fn().mockResolvedValue({ userId: 'owner-1' }),
      },
      $transaction: jest.fn((cb: (tx: any) => unknown) => cb(prisma)),
    };
    escrow = {
      refund: jest.fn().mockResolvedValue({}),
      release: jest.fn().mockResolvedValue({}),
    };
    notifications = { createForUser: jest.fn().mockResolvedValue(undefined) };
    fees = {
      resolveFeeConfig: jest.fn().mockResolvedValue(null),
      calculateFee: jest.fn(),
      chargeProviderFee: jest.fn(),
    };
    service = new CatalogService(prisma, notifications, escrow, fees);
  });

  describe('cancelOrderByBuyer', () => {
    it('el comprador cancela un pedido sin atender: reembolsa la garantía y devuelve el stock', async () => {
      const result = await service.cancelOrderByBuyer('order-1', REQUESTER_ID);

      expect(prisma.catalogOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'CANCELLED' }),
      });
      expect(escrow.refund).toHaveBeenCalledWith({
        entityType: 'CATALOG_ORDER',
        entityId: 'order-1',
        payerId: REQUESTER_ID,
        amount: order().escrowAmount,
      });
      expect(result.data!.escrowStatus).toBe('REFUNDED');

      // 2 cafés sueltos + 1 del pack = 3; 3 tortas del pack.
      const increments = prisma.product.updateMany.mock.calls
        .filter(([arg]: any) => arg.data.stock)
        .map(([arg]: any) => [arg.where.id, arg.data.stock.increment]);
      expect(increments).toEqual([
        ['p-cafe', 3],
        ['p-torta', 3],
      ]);
      // El producto vuelve a estar disponible (stock 4 > mínimo 2).
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p-cafe' },
        data: { status: ProductStatus.AVAILABLE },
      });
      // Revierte "más vendidos" sin bajar de 0.
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'p-cafe', salesCount: { gte: 2 } },
        data: { salesCount: { decrement: 2 } },
      });
    });

    it('no deja cancelar un pedido que el comercio ya contactó', async () => {
      prisma.catalogOrder.findUnique.mockResolvedValue(
        order({ status: 'CONTACTED' })
      );
      await expect(
        service.cancelOrderByBuyer('order-1', REQUESTER_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(escrow.refund).not.toHaveBeenCalled();
    });

    it('solo el comprador puede cancelar', async () => {
      await expect(
        service.cancelOrderByBuyer('order-1', 'otro')
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('si otro proceso ya cambió el estado, no reembolsa ni devuelve stock', async () => {
      prisma.catalogOrder.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.cancelOrderByBuyer('order-1', REQUESTER_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(escrow.refund).not.toHaveBeenCalled();
      expect(prisma.product.updateMany).not.toHaveBeenCalled();
    });

    it('un pedido en disputa no se cancela: lo resuelve un admin', async () => {
      prisma.catalogOrder.findUnique.mockResolvedValue(
        order({ escrowStatus: 'DISPUTED' })
      );
      await expect(
        service.cancelOrderByBuyer('order-1', REQUESTER_ID)
      ).rejects.toThrow('disputa');
      expect(prisma.catalogOrder.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('enforceEscrowDeadlines', () => {
    it('reembolsa lo que el comercio no atendió y libera lo que el comprador no confirmó', async () => {
      const unanswered = order({ id: 'o-viejo', status: 'SEEN' });
      const unconfirmed = order({ id: 'o-entregado', status: 'CONTACTED' });
      prisma.catalogOrder.findMany
        .mockResolvedValueOnce([unanswered])
        .mockResolvedValueOnce([unconfirmed]);

      const now = new Date('2026-11-10T12:00:00Z');
      const result = await service.enforceEscrowDeadlines(now);

      expect(result).toEqual({ refunded: 1, released: 1 });
      expect(escrow.refund).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: 'o-viejo', payerId: REQUESTER_ID })
      );
      expect(escrow.release).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: 'o-entregado', payeeId: 'owner-1' })
      );
      expect(notifications.createForUser).toHaveBeenCalledWith(
        REQUESTER_ID,
        expect.objectContaining({ title: 'Pedido cancelado y reembolsado' })
      );

      // Plazos por defecto: 3 días sin respuesta, 7 sin confirmar.
      const [first, second] = prisma.catalogOrder.findMany.mock.calls.map(
        ([arg]: any) => arg.where
      );
      expect(first.status).toEqual({ in: ['PENDING', 'SEEN'] });
      expect(first.OR[0].statusUpdatedAt.lt).toEqual(
        new Date('2026-11-07T12:00:00Z')
      );
      expect(second.status).toBe('CONTACTED');
      expect(second.OR[0].statusUpdatedAt.lt).toEqual(
        new Date('2026-11-03T12:00:00Z')
      );
      // Sin respuesta del comercio: también los pedidos sin garantía.
      expect(first.escrowStatus).toEqual({ in: ['HELD', 'NONE'] });
    });

    it('cierra los pedidos que el comercio marcó entregados hace 72 h, salvo los reportados', async () => {
      const entregado = order({
        id: 'o-entregado-sin-garantia',
        status: 'CONTACTED',
        escrowStatus: 'NONE',
        escrowAmount: null,
        totalEstimate: new Prisma.Decimal(40),
        commerceCompletedAt: new Date('2026-11-05T12:00:00Z'),
      });
      const reportado = order({
        id: 'o-reportado',
        status: 'CONTACTED',
        escrowStatus: 'NONE',
        commerceCompletedAt: new Date('2026-11-05T12:00:00Z'),
      });
      prisma.catalogOrder.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([entregado, reportado]);
      prisma.report.findMany.mockResolvedValue([{ entityId: 'o-reportado' }]);
      fees.resolveFeeConfig.mockResolvedValue({ rate: 5, payer: 'PROVIDER' });
      fees.calculateFee.mockReturnValue({ feeAmount: 2 });

      const now = new Date('2026-11-10T12:00:00Z');
      const result = await service.enforceEscrowDeadlines(now);

      expect(result.released).toBe(1);
      const third = prisma.catalogOrder.findMany.mock.calls[2][0].where;
      expect(third.commerceCompletedAt.lte).toEqual(
        new Date('2026-11-07T12:00:00Z')
      );
      // Sin garantía la comisión va al estado de cuenta del comercio.
      expect(fees.chargeProviderFee).toHaveBeenCalledTimes(1);
      expect(fees.chargeProviderFee).toHaveBeenCalledWith(
        'CATALOG_ORDER',
        'owner-1',
        2,
        'FEE-CATALOG-o-entregado-sin-garantia',
        { catalogOrderId: 'o-entregado-sin-garantia' },
        { collected: false }
      );
      expect(escrow.release).not.toHaveBeenCalled();
    });

    it('marcar entregado solo desde CONTACTED y avisa al comprador', async () => {
      prisma.catalogOrder.findUnique.mockResolvedValue(
        order({
          status: 'CONTACTED',
          escrowStatus: 'NONE',
          commerceCompletedAt: null,
        })
      );
      prisma.catalogOrder.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...order(), ...data })
      );
      const result = await service.markOrderDelivered('order-1', 'commerce-1');
      expect(result.data.commerceCompletedAt).toBeInstanceOf(Date);
      expect(notifications.createForUser).toHaveBeenCalledWith(
        REQUESTER_ID,
        expect.objectContaining({ title: 'Tu pedido fue entregado' })
      );

      prisma.catalogOrder.findUnique.mockResolvedValue(
        order({ status: 'PENDING' })
      );
      await expect(
        service.markOrderDelivered('order-1', 'commerce-1')
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.markOrderDelivered('order-1', 'otro-comercio')
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('un fallo en un pedido no frena a los demás', async () => {
      prisma.catalogOrder.findMany
        .mockResolvedValueOnce([order({ id: 'a' }), order({ id: 'b' })])
        .mockResolvedValueOnce([]);
      escrow.refund
        .mockRejectedValueOnce(new Error('falló'))
        .mockResolvedValueOnce({});

      const result = await service.enforceEscrowDeadlines();
      expect(result.refunded).toBe(1);
      expect(escrow.refund).toHaveBeenCalledTimes(2);
    });
  });
});
