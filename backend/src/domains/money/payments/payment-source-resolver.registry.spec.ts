import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  PaymentSourceResolver,
  ResolvedPaymentSource,
} from './payment-source-resolver.interface';
import { PaymentSourceResolverRegistry } from './payment-source-resolver.registry';

describe('PaymentSourceResolverRegistry', () => {
  const valid: ResolvedPaymentSource = {
    sourceType: 'CATALOG_ORDER',
    sourceId: 'order-1',
    payerUserId: 'buyer-1',
    sellerUserId: 'seller-1',
    currency: 'USD',
    baseAmount: '25.90',
    description: 'Pedido de catálogo',
  };

  const makeResolver = (
    resolve = jest.fn().mockResolvedValue(valid)
  ): PaymentSourceResolver => ({
    sourceType: 'CATALOG_ORDER',
    resolve,
  });

  it('fails closed for source types without a registered resolver', async () => {
    const registry = new PaymentSourceResolverRegistry([]);
    await expect(
      registry.resolve('CATALOG_ORDER', 'order-1', 'buyer-1')
    ).rejects.toThrow('aún no está habilitado');
  });

  it('rejects duplicate resolver registrations', () => {
    expect(
      () =>
        new PaymentSourceResolverRegistry([makeResolver(), makeResolver()])
    ).toThrow(ConflictException);
  });

  it('uses the requested source ID and authenticated payer', async () => {
    const resolve = jest.fn().mockResolvedValue(valid);
    const registry = new PaymentSourceResolverRegistry([makeResolver(resolve)]);
    await expect(
      registry.resolve('CATALOG_ORDER', 'order-1', 'buyer-1')
    ).resolves.toEqual(valid);
    expect(resolve).toHaveBeenCalledWith('order-1', 'buyer-1');
  });

  it('rejects source or payer mismatches', async () => {
    const registry = new PaymentSourceResolverRegistry([
      makeResolver(
        jest.fn().mockResolvedValue({ ...valid, payerUserId: 'other-user' })
      ),
    ]);
    await expect(
      registry.resolve('CATALOG_ORDER', 'order-1', 'buyer-1')
    ).rejects.toThrow(BadRequestException);
  });

  it.each(['0', '0.00', '-1', '1.234', 'NaN', 'Infinity', '1e3'])(
    'rejects invalid amount %s',
    async (baseAmount) => {
      const registry = new PaymentSourceResolverRegistry([
        makeResolver(jest.fn().mockResolvedValue({ ...valid, baseAmount })),
      ]);
      await expect(
        registry.resolve('CATALOG_ORDER', 'order-1', 'buyer-1')
      ).rejects.toThrow(BadRequestException);
    }
  );

  it('rejects unsupported currencies', async () => {
    const registry = new PaymentSourceResolverRegistry([
      makeResolver(jest.fn().mockResolvedValue({ ...valid, currency: 'EUR' })),
    ]);
    await expect(
      registry.resolve('CATALOG_ORDER', 'order-1', 'buyer-1')
    ).rejects.toThrow(BadRequestException);
  });
});
