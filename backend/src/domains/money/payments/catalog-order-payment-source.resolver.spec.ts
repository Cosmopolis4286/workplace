import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CatalogOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CatalogOrderPaymentSourceResolver,
} from './catalog-order-payment-source.resolver';

describe('CatalogOrderPaymentSourceResolver', () => {
  const order = {
    id: 'order-1',
    requesterId: 'buyer-1',
    commerceId: 'commerce-1',
    commerceName: 'Tienda Uno',
    totalEstimate: new Prisma.Decimal('25.90'),
    status: CatalogOrderStatus.PENDING,
  };
  const prisma = {
    catalogOrder: { findUnique: jest.fn() },
    commerce: { findUnique: jest.fn() },
  } as unknown as PrismaService;
  let resolver: CatalogOrderPaymentSourceResolver;

  beforeEach(() => {
    jest.clearAllMocks();
    resolver = new CatalogOrderPaymentSourceResolver(prisma);
    (prisma.catalogOrder.findUnique as jest.Mock).mockResolvedValue(order);
    (prisma.commerce.findUnique as jest.Mock).mockResolvedValue({
      userId: 'seller-1',
      settings: { currency: 'USD' },
    });
  });

  it(
    'derives amount, currency and seller from persisted records',
    async () => {
      await expect(resolver.resolve('order-1', 'buyer-1')).resolves.toEqual({
      sourceType: 'CATALOG_ORDER',
      sourceId: 'order-1',
      payerUserId: 'buyer-1',
      sellerUserId: 'seller-1',
      currency: 'USD',
      baseAmount: '25.90',
      description: 'Pedido de catálogo - Tienda Uno',
        quoteVersion: CatalogOrderStatus.PENDING,
      });
    }
  );

  it('rejects unknown orders', async () => {
    (prisma.catalogOrder.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      resolver.resolve('missing', 'buyer-1')
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a different payer', async () => {
    await expect(
      resolver.resolve('order-1', 'attacker')
    ).rejects.toThrow(BadRequestException);
    expect(prisma.commerce.findUnique).not.toHaveBeenCalled();
  });

  it.each([CatalogOrderStatus.CANCELLED, CatalogOrderStatus.CLOSED])(
    'rejects terminal order status %s',
    async (status) => {
      (prisma.catalogOrder.findUnique as jest.Mock).mockResolvedValue({
        ...order,
        status,
      });
      await expect(
        resolver.resolve('order-1', 'buyer-1')
      ).rejects.toThrow(BadRequestException);
    }
  );

  it('rejects an order without a positive persisted total', async () => {
    (prisma.catalogOrder.findUnique as jest.Mock).mockResolvedValue({
      ...order,
      totalEstimate: new Prisma.Decimal('0'),
    });
    await expect(
      resolver.resolve('order-1', 'buyer-1')
    ).rejects.toThrow(BadRequestException);
  });

  it.each(['MXN', 'EUR', null])(
    'fails closed for unsupported or missing currency %s',
    async (currency) => {
      (prisma.commerce.findUnique as jest.Mock).mockResolvedValue({
        userId: 'seller-1',
        settings: currency ? { currency } : null,
      });
      await expect(
        resolver.resolve('order-1', 'buyer-1')
      ).rejects.toThrow('moneda del comercio no está habilitada');
    }
  );

  it('supports VES currency case-insensitively', async () => {
    (prisma.commerce.findUnique as jest.Mock).mockResolvedValue({
      userId: 'seller-1',
      settings: { currency: 'ves' },
    });
    await expect(
      resolver.resolve('order-1', 'buyer-1')
    ).resolves.toMatchObject({ currency: 'VES' });
  });
});
