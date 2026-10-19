import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { CatalogService } from '../../domains/commerce-core/catalog/catalog.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../domains/engagement/notifications/notifications.service';
import {
  EscrowFacade,
  ESCROW_FACADE,
} from '../../domains/money/escrow/escrow.facade';
import {
  PlatformFeesFacade,
  PLATFORM_FEES_FACADE,
} from '../../domains/money/platform-fees/platform-fees.facade';
import { InsufficientEscrowFundsError } from '../../domains/money/wallets/wallet.errors';
import { money } from '../money-matcher';

describe('CatalogService', () => {
  let service: CatalogService;
  let mockPrismaService: any;
  let mockNotificationsService: Partial<NotificationsService>;
  let mockEscrowService: Partial<EscrowFacade>;
  let mockPlatformFeesService: Partial<PlatformFeesFacade>;

  const REQUESTER_ID = 'requester-1';
  const PRODUCT_ID = 'product-1';
  const BUNDLE_ID = 'bundle-1';
  const COMPONENT_ID = 'component-1';
  const COMMERCE_ID = 'commerce-1';

  function baseProduct(overrides: Partial<any> = {}) {
    return {
      id: PRODUCT_ID,
      name: 'Torta de chocolate',
      price: 25,
      status: ProductStatus.AVAILABLE,
      forSale: true,
      isBundle: false,
      commerceId: COMMERCE_ID,
      commerce: { name: 'Pastelería Ana' },
      bundleItems: [],
      minStock: 5,
      stock: 100,
      ...overrides,
    };
  }

  function baseDto(overrides: Partial<any> = {}) {
    return {
      commerceId: COMMERCE_ID,
      items: [{ productId: PRODUCT_ID, quantity: 2 }],
      deliveryType: 'HOME_DELIVERY',
      buyerName: 'Cliente Uno',
      buyerPhone: '+58111',
      ...overrides,
    };
  }

  beforeEach(async () => {
    mockPrismaService = {
      product: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ stock: 98 }),
        update: jest.fn(),
      },
      catalogOrder: { create: jest.fn() },
      commerce: { findUnique: jest.fn() },
      $transaction: jest.fn((callback: (tx: any) => unknown) =>
        callback(mockPrismaService)
      ),
    };
    mockNotificationsService = {
      notifyNewCatalogOrder: jest.fn().mockResolvedValue(undefined),
      notifyLowStock: jest.fn().mockResolvedValue(undefined),
      notifyEscrowDisputeOpened: jest.fn().mockResolvedValue(undefined),
    };
    mockEscrowService = {
      hold: jest.fn().mockResolvedValue({}),
      release: jest.fn().mockResolvedValue({}),
      refund: jest.fn().mockResolvedValue({}),
      openDispute: jest.fn().mockResolvedValue({}),
    };
    mockPlatformFeesService = {
      resolveFeeConfig: jest.fn().mockResolvedValue(null),
      calculateFee: jest.fn(),
      chargeProviderFee: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ESCROW_FACADE, useValue: mockEscrowService },
        { provide: PLATFORM_FEES_FACADE, useValue: mockPlatformFeesService },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  describe('createOrder', () => {
    it('lanza NotFoundException si el producto no existe', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await expect(
        service.createOrder(baseDto() as any, REQUESTER_ID)
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.catalogOrder.create).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el producto no está disponible (forSale=false)', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        baseProduct({ forSale: false }),
      ]);

      await expect(
        service.createOrder(baseDto() as any, REQUESTER_ID)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza NotFoundException si el producto no está AVAILABLE', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        baseProduct({ status: ProductStatus.OUT_OF_STOCK }),
      ]);

      await expect(
        service.createOrder(baseDto() as any, REQUESTER_ID)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza si el commerceId del body no coincide con el dueño real del producto', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([
        baseProduct({ commerceId: 'otro-comercio' }),
      ]);

      await expect(
        service.createOrder(baseDto() as any, REQUESTER_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrismaService.catalogOrder.create).not.toHaveBeenCalled();
    });

    it('calcula totalEstimate exacto al centavo (3 × 0.1 = 0.3)', async () => {
      mockPrismaService.product.findMany.mockImplementation(({ select }: any) =>
        Promise.resolve(
          select?.minStock
            ? [{ id: PRODUCT_ID, minStock: 5, name: 'Chicle' }]
            : [baseProduct({ price: '0.10' })]
        )
      );
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.catalogOrder.create.mockImplementation(
        ({ data }: any) =>
          Promise.resolve({ id: 'order-1', ...data, items: data.items.create })
      );

      const result = await service.createOrder(
        baseDto({ items: [{ productId: PRODUCT_ID, quantity: 3 }] }) as any,
        REQUESTER_ID
      );

      expect(0.1 * 3).not.toBe(0.3);
      expect(result.data.totalEstimate.toString()).toBe('0.3');
    });

    it('deriva productName/commerceName/unitPrice/totalEstimate del producto real, no del body', async () => {
      mockPrismaService.product.findMany.mockImplementation(({ select }: any) =>
        Promise.resolve(
          select?.minStock
            ? [{ id: PRODUCT_ID, minStock: 5, name: 'Torta de chocolate' }]
            : [baseProduct()]
        )
      );
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.catalogOrder.create.mockImplementation(
        ({ data }: any) =>
          Promise.resolve({ id: 'order-1', ...data, items: data.items.create })
      );

      const result = await service.createOrder(baseDto() as any, REQUESTER_ID);

      expect(result.data.commerceName).toBe('Pastelería Ana');
      expect(result.data.totalEstimate).toEqual(money(50)); // price 25 * quantity 2
      expect(result.data.items[0]).toMatchObject({
        productId: PRODUCT_ID,
        productName: 'Torta de chocolate',
        unitPrice: 25,
        quantity: 2,
        isBundle: false,
      });
    });

    it('descuenta stock del producto y rechaza si no alcanza (stock insuficiente)', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([baseProduct()]);
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.createOrder(baseDto() as any, REQUESTER_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrismaService.catalogOrder.create).not.toHaveBeenCalled();
    });

    it('un pack (isBundle) descuenta stock de sus componentes, no de sí mismo', async () => {
      const bundle = baseProduct({
        id: BUNDLE_ID,
        name: 'Combo Familiar',
        price: 40,
        isBundle: true,
        bundleItems: [{ componentProductId: COMPONENT_ID, quantity: 2 }],
      });
      mockPrismaService.product.findMany.mockImplementation(({ select }: any) =>
        Promise.resolve(
          select?.minStock
            ? [{ id: COMPONENT_ID, minStock: 5, name: 'Componente' }]
            : [bundle]
        )
      );
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.catalogOrder.create.mockImplementation(
        ({ data }: any) =>
          Promise.resolve({ id: 'order-1', ...data, items: data.items.create })
      );

      await service.createOrder(
        baseDto({ items: [{ productId: BUNDLE_ID, quantity: 3 }] }) as any,
        REQUESTER_ID
      );

      // 3 packs x 2 unidades del componente por pack = 6 a descontar del componente
      expect(mockPrismaService.product.updateMany).toHaveBeenCalledWith({
        where: { id: COMPONENT_ID, stock: { gte: 6 } },
        data: { stock: { decrement: 6 } },
      });
      // El pack en sí nunca se descuenta como stock propio
      expect(mockPrismaService.product.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: BUNDLE_ID,
            stock: expect.anything(),
          }),
        })
      );
    });

    it('incrementa salesCount y notifica al comercio con los datos reales', async () => {
      mockPrismaService.product.findMany.mockImplementation(({ select }: any) =>
        Promise.resolve(
          select?.minStock
            ? [{ id: PRODUCT_ID, minStock: 5, name: 'Torta de chocolate' }]
            : [baseProduct()]
        )
      );
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.catalogOrder.create.mockImplementation(
        ({ data }: any) =>
          Promise.resolve({ id: 'order-1', ...data, items: data.items.create })
      );

      await service.createOrder(baseDto() as any, REQUESTER_ID);

      expect(mockPrismaService.product.updateMany).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID },
        data: { salesCount: { increment: 2 } },
      });
      expect(
        mockNotificationsService.notifyNewCatalogOrder
      ).toHaveBeenCalledWith(
        COMMERCE_ID,
        'Cliente Uno',
        'Torta de chocolate',
        2,
        50
      );
    });

    it('recalcula status a OUT_OF_STOCK y notifica stock bajo cuando el stock queda en 0', async () => {
      mockPrismaService.product.findMany.mockImplementation(({ select }: any) =>
        Promise.resolve(
          select?.minStock
            ? [{ id: PRODUCT_ID, minStock: 5, name: 'Torta de chocolate' }]
            : [baseProduct()]
        )
      );
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.product.findUnique.mockResolvedValue({ stock: 0 });
      mockPrismaService.catalogOrder.create.mockImplementation(
        ({ data }: any) =>
          Promise.resolve({ id: 'order-1', ...data, items: data.items.create })
      );

      await service.createOrder(baseDto() as any, REQUESTER_ID);

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID },
        data: { status: 'OUT_OF_STOCK' },
      });
      expect(mockNotificationsService.notifyLowStock).toHaveBeenCalledWith(
        COMMERCE_ID,
        'Torta de chocolate',
        0
      );
    });

    it('no notifica stock bajo si el stock restante sigue por encima de minStock', async () => {
      mockPrismaService.product.findMany.mockImplementation(({ select }: any) =>
        Promise.resolve(
          select?.minStock
            ? [{ id: PRODUCT_ID, minStock: 5, name: 'Torta de chocolate' }]
            : [baseProduct()]
        )
      );
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.product.findUnique.mockResolvedValue({ stock: 98 });
      mockPrismaService.catalogOrder.create.mockImplementation(
        ({ data }: any) =>
          Promise.resolve({ id: 'order-1', ...data, items: data.items.create })
      );

      await service.createOrder(baseDto() as any, REQUESTER_ID);

      expect(mockNotificationsService.notifyLowStock).not.toHaveBeenCalled();
    });
  });

  describe('createOrder — Pago Protegido (escrow)', () => {
    function setupHappyPath() {
      mockPrismaService.product.findMany.mockImplementation(({ select }: any) =>
        Promise.resolve(
          select?.minStock
            ? [{ id: PRODUCT_ID, minStock: 5, name: 'Torta de chocolate' }]
            : [baseProduct()]
        )
      );
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.catalogOrder.create.mockImplementation(
        ({ data }: any) =>
          Promise.resolve({ id: data.id, ...data, items: data.items.create })
      );
    }

    it('does nothing with escrow when the commerce did not activate requiresEscrowForCatalogOrders', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
        settings: { requiresEscrowForCatalogOrders: false },
      });
      setupHappyPath();

      await service.createOrder(baseDto() as any, REQUESTER_ID);

      expect(mockEscrowService.hold).not.toHaveBeenCalled();
    });

    it('holds the escrow before touching stock when the commerce requires it', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
        settings: { requiresEscrowForCatalogOrders: true },
      });
      setupHappyPath();

      const result = await service.createOrder(baseDto() as any, REQUESTER_ID);

      expect(mockEscrowService.hold).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CATALOG_ORDER',
          payerId: REQUESTER_ID,
          payeeId: 'owner-1',
          deltaAmount: money(50),
        })
      );
      expect(result.data.escrowStatus).toBe('HELD');
      expect(result.data.escrowAmount).toEqual(money(50));
    });

    it('rejects with BadRequestException (not the raw wallet error) when the buyer has insufficient funds', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
        settings: { requiresEscrowForCatalogOrders: true },
      });
      mockPrismaService.product.findMany.mockResolvedValue([baseProduct()]);
      (mockEscrowService.hold as jest.Mock).mockRejectedValue(
        new InsufficientEscrowFundsError('no funds')
      );

      await expect(
        service.createOrder(baseDto() as any, REQUESTER_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrismaService.catalogOrder.create).not.toHaveBeenCalled();
    });

    it('never creates an order for an anonymous buyer when the commerce requires escrow', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
        settings: { requiresEscrowForCatalogOrders: true },
      });
      mockPrismaService.product.findMany.mockResolvedValue([baseProduct()]);

      await expect(
        service.createOrder(baseDto() as any, undefined as any)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockEscrowService.hold).not.toHaveBeenCalled();
    });

    it('refunds the escrow if the stock transaction fails after the hold already succeeded', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
        settings: { requiresEscrowForCatalogOrders: true },
      });
      mockPrismaService.product.findMany.mockResolvedValue([baseProduct()]);
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 0 }); // stock insuficiente, detectado DESPUÉS del hold

      await expect(
        service.createOrder(baseDto() as any, REQUESTER_ID)
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(mockEscrowService.hold).toHaveBeenCalled();
      expect(mockEscrowService.refund).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CATALOG_ORDER',
          payerId: REQUESTER_ID,
          amount: money(50),
        })
      );
    });

    it('adds the platform fee on top of the escrow amount when the fee payer is CLIENT', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
        settings: { requiresEscrowForCatalogOrders: true },
      });
      mockPlatformFeesService.resolveFeeConfig = jest
        .fn()
        .mockResolvedValue({ rate: 10, payer: 'CLIENT' });
      mockPlatformFeesService.calculateFee = jest
        .fn()
        .mockReturnValue({ feeAmount: 5 });
      setupHappyPath();

      const result = await service.createOrder(baseDto() as any, REQUESTER_ID);

      expect(mockEscrowService.hold).toHaveBeenCalledWith(
        expect.objectContaining({ deltaAmount: money(55) })
      );
      expect(result.data.escrowAmount).toEqual(money(55));
      expect(result.data.platformFeeRate).toBe(10);
    });
  });

  describe('updateOrderStatus — Pago Protegido (escrow)', () => {
    function baseOrder(overrides: Partial<any> = {}) {
      return {
        id: 'order-1',
        commerceId: COMMERCE_ID,
        status: 'PENDING',
        requesterId: REQUESTER_ID,
        escrowStatus: 'NONE',
        escrowAmount: null,
        ...overrides,
      };
    }

    beforeEach(() => {
      mockPrismaService.catalogOrder = {
        ...mockPrismaService.catalogOrder,
        findUnique: jest.fn(),
        update: jest.fn(),
      };
    });

    it('rejects any transition once the order is terminal (CLOSED/CANCELLED)', async () => {
      mockPrismaService.catalogOrder.findUnique.mockResolvedValue(
        baseOrder({ status: 'CANCELLED' })
      );

      await expect(
        service.updateOrderStatus('order-1', COMMERCE_ID, 'SEEN' as any)
      ).rejects.toThrow('No puedes cambiar el estado de un pedido CANCELLED');
    });

    it('rejects the commerce trying to set CLOSED directly (only the buyer can via confirmOrderCompletion)', async () => {
      mockPrismaService.catalogOrder.findUnique.mockResolvedValue(
        baseOrder({ status: 'CONTACTED' })
      );

      await expect(
        service.updateOrderStatus('order-1', COMMERCE_ID, 'CLOSED' as any)
      ).rejects.toThrow(
        'Solo el comprador puede confirmar la finalización de un pedido'
      );
    });

    it('refunds the held escrow when the commerce cancels the order', async () => {
      mockPrismaService.catalogOrder.findUnique.mockResolvedValue(
        baseOrder({
          status: 'CONTACTED',
          escrowStatus: 'HELD',
          escrowAmount: 50,
        })
      );
      mockPrismaService.catalogOrder.update.mockImplementation(
        ({ data }: any) => Promise.resolve({ ...data })
      );

      const result = await service.updateOrderStatus(
        'order-1',
        COMMERCE_ID,
        'CANCELLED' as any
      );

      expect(mockEscrowService.refund).toHaveBeenCalledWith({
        entityType: 'CATALOG_ORDER',
        entityId: 'order-1',
        payerId: REQUESTER_ID,
        amount: 50,
      });
      expect(result.data.escrowStatus).toBe('REFUNDED');
    });

    it('does not touch escrow when cancelling an order with no escrow retained', async () => {
      mockPrismaService.catalogOrder.findUnique.mockResolvedValue(
        baseOrder({ status: 'PENDING' })
      );
      mockPrismaService.catalogOrder.update.mockImplementation(
        ({ data }: any) => Promise.resolve({ ...data })
      );

      await service.updateOrderStatus(
        'order-1',
        COMMERCE_ID,
        'CANCELLED' as any
      );

      expect(mockEscrowService.refund).not.toHaveBeenCalled();
    });
  });

  describe('confirmOrderCompletion — Pago Protegido (escrow)', () => {
    function baseOrder(overrides: Partial<any> = {}) {
      return {
        id: 'order-1',
        commerceId: COMMERCE_ID,
        status: 'CONTACTED',
        requesterId: REQUESTER_ID,
        escrowStatus: 'NONE',
        escrowAmount: null,
        platformFeeRate: null,
        platformFeeAmount: null,
        ...overrides,
      };
    }

    beforeEach(() => {
      mockPrismaService.catalogOrder = {
        ...mockPrismaService.catalogOrder,
        findUnique: jest.fn(),
        update: jest.fn(),
      };
    });

    it('releases the full escrow to the commerce when the fee was already charged to the buyer at creation', async () => {
      mockPrismaService.catalogOrder.findUnique.mockResolvedValue(
        baseOrder({
          escrowStatus: 'HELD',
          escrowAmount: 55,
          platformFeeRate: 10,
          platformFeeAmount: 5,
        })
      );
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
      });
      mockPrismaService.catalogOrder.update.mockImplementation(
        ({ data }: any) => Promise.resolve({ ...data })
      );

      const result = await service.confirmOrderCompletion(
        'order-1',
        REQUESTER_ID
      );

      expect(mockPlatformFeesService.chargeProviderFee).not.toHaveBeenCalled();
      expect(mockEscrowService.release).toHaveBeenCalledWith({
        entityType: 'CATALOG_ORDER',
        entityId: 'order-1',
        payeeId: 'owner-1',
        amount: 55,
      });
      expect(result.data.status).toBe('CLOSED');
      expect(result.data.escrowStatus).toBe('RELEASED');
    });

    it('charges the provider fee now and releases the net amount when the fee was not charged at creation', async () => {
      mockPrismaService.catalogOrder.findUnique.mockResolvedValue(
        baseOrder({ escrowStatus: 'HELD', escrowAmount: 100 })
      );
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
      });
      mockPlatformFeesService.resolveFeeConfig = jest
        .fn()
        .mockResolvedValue({ rate: 8, payer: 'PROVIDER' });
      mockPlatformFeesService.calculateFee = jest
        .fn()
        .mockReturnValue({ feeAmount: 8 });
      mockPrismaService.catalogOrder.update.mockImplementation(
        ({ data }: any) => Promise.resolve({ ...data })
      );

      const result = await service.confirmOrderCompletion(
        'order-1',
        REQUESTER_ID
      );

      expect(mockPlatformFeesService.chargeProviderFee).toHaveBeenCalledWith(
        'CATALOG_ORDER',
        'owner-1',
        8,
        'FEE-CATALOG-order-1',
        { catalogOrderId: 'order-1' }
      );
      expect(mockEscrowService.release).toHaveBeenCalledWith(
        expect.objectContaining({ amount: money(92) })
      );
      expect(result.data.platformFeeAmount).toBe(8);
    });

    it('does not touch escrow when confirming an order with no escrow retained', async () => {
      mockPrismaService.catalogOrder.findUnique.mockResolvedValue(baseOrder());
      mockPrismaService.catalogOrder.update.mockImplementation(
        ({ data }: any) => Promise.resolve({ ...data })
      );

      await service.confirmOrderCompletion('order-1', REQUESTER_ID);

      expect(mockEscrowService.release).not.toHaveBeenCalled();
    });
  });

  describe('disputeOrder — Pago Protegido (escrow)', () => {
    function baseOrder(overrides: Partial<any> = {}) {
      return {
        id: 'order-1',
        commerceId: COMMERCE_ID,
        commerceName: 'Pastelería Ana',
        status: 'CONTACTED',
        requesterId: REQUESTER_ID,
        escrowStatus: 'HELD',
        escrowAmount: 100,
        ...overrides,
      };
    }

    beforeEach(() => {
      mockPrismaService.catalogOrder = {
        ...mockPrismaService.catalogOrder,
        findUnique: jest.fn(),
      };
    });

    it('rejects if the caller is neither the buyer nor the commerce owner', async () => {
      mockPrismaService.catalogOrder.findUnique.mockResolvedValue(baseOrder());
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
      });

      await expect(
        service.disputeOrder('order-1', 'stranger', 'No llegó')
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockEscrowService.openDispute).not.toHaveBeenCalled();
    });

    it('rejects disputing an order that is not CONTACTED', async () => {
      mockPrismaService.catalogOrder.findUnique.mockResolvedValue(
        baseOrder({ status: 'PENDING' })
      );
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
      });

      await expect(
        service.disputeOrder('order-1', REQUESTER_ID, 'No llegó')
      ).rejects.toThrow(
        'Solo se puede disputar un pedido en curso (contactado)'
      );
    });

    it('opens the dispute and notifies the commerce owner when the buyer disputes', async () => {
      mockPrismaService.catalogOrder.findUnique.mockResolvedValue(baseOrder());
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
      });

      await service.disputeOrder('order-1', REQUESTER_ID, 'Llegó incompleto');

      expect(mockEscrowService.openDispute).toHaveBeenCalledWith({
        entityType: 'CATALOG_ORDER',
        entityId: 'order-1',
        raisedById: REQUESTER_ID,
        reason: 'Llegó incompleto',
      });
      expect(
        mockNotificationsService.notifyEscrowDisputeOpened
      ).toHaveBeenCalledWith('owner-1', 'Pastelería Ana');
    });

    it('notifies the buyer when the commerce owner disputes', async () => {
      mockPrismaService.catalogOrder.findUnique.mockResolvedValue(baseOrder());
      mockPrismaService.commerce.findUnique.mockResolvedValue({
        userId: 'owner-1',
      });

      await service.disputeOrder(
        'order-1',
        'owner-1',
        'El comprador no confirma'
      );

      expect(
        mockNotificationsService.notifyEscrowDisputeOpened
      ).toHaveBeenCalledWith(REQUESTER_ID, 'Pastelería Ana');
    });
  });

  describe('getStoreBySlug', () => {
    function baseCommerce(overrides: Partial<any> = {}) {
      return {
        id: COMMERCE_ID,
        userId: 'owner-1',
        name: 'Pastelería Ana',
        isPublic: true,
        description: null,
        socialLinks: null,
        user: { avatar: null, coverImage: null },
        settings: null,
        _count: { products: 3 },
        ...overrides,
      };
    }

    it('lanza NotFoundException si el slug no existe', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue(null);

      await expect(
        service.getStoreBySlug('inexistente')
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza NotFoundException si la tienda está oculta (isPublic=false) y quien pide no es el dueño', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue(
        baseCommerce({ isPublic: false })
      );

      await expect(
        service.getStoreBySlug('mi-tienda', 'otro-usuario')
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getStoreBySlug('mi-tienda')).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('permite al dueño ver su propia tienda aunque esté oculta (isPublic=false)', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue(
        baseCommerce({ isPublic: false })
      );

      const result = await service.getStoreBySlug('mi-tienda', 'owner-1');

      expect(result.data.name).toBe('Pastelería Ana');
      expect(result.data.productCount).toBe(3);
    });

    it('devuelve la tienda pública normalmente y no filtra el userId interno', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue(baseCommerce());

      const result = await service.getStoreBySlug('mi-tienda');

      expect(result.data.productCount).toBe(3);
      expect((result.data as any).userId).toBeUndefined();
    });

    it('expone professionalSlug cuando el dueño tiene FreelancerSettings con slug ("opción 2")', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue(
        baseCommerce({
          user: {
            avatar: null,
            coverImage: null,
            freelancerSettings: { slug: 'maria-cocina' },
          },
        })
      );

      const result = await service.getStoreBySlug('mi-tienda');

      expect((result.data as any).professionalSlug).toBe('maria-cocina');
    });

    it('professionalSlug es null cuando el dueño no tiene perfil profesional con slug', async () => {
      mockPrismaService.commerce.findUnique.mockResolvedValue(baseCommerce());

      const result = await service.getStoreBySlug('mi-tienda');

      expect((result.data as any).professionalSlug).toBeNull();
      expect((result.data as any).user).toEqual({
        avatar: null,
        coverImage: null,
      });
    });
  });
});
