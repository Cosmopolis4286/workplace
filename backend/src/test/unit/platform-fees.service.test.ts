import { Prisma } from '@prisma/client';
import { PlatformFeesService } from '../../domains/money/platform-fees/platform-fees.service';

describe('PlatformFeesService', () => {
  const prisma = {
    platformFeeRate: { findFirst: jest.fn() },
    platformFeeOverride: { findFirst: jest.fn() },
    subscription: { findFirst: jest.fn() },
  };
  const billing = {
    recordCharge: jest.fn().mockResolvedValue({ id: 'c1' }),
    recordChargeInTransaction: jest.fn().mockResolvedValue({
      charge: { id: 'tx-charge' },
      created: true,
    }),
    notifyChargeRecorded: jest.fn().mockResolvedValue(undefined),
  };
  const service = new PlatformFeesService(prisma as any, billing as any);

  beforeEach(() => jest.clearAllMocks());

  describe('calculateFee', () => {
    it('redondea HALF_UP al centavo donde Float redondeaba hacia abajo', () => {
      // 1.45 × 10% = 0.145 → Float: Math.round(14.499…) / 100 = 0.14
      expect(Math.round(1.45 * (10 / 100) * 100) / 100).toBe(0.14);
      expect(
        service.calculateFee(1.45, { rate: 10, payer: 'CLIENT' }).feeAmount
      ).toBe(0.15);
      expect(
        service.calculateFee(0.35, { rate: 10, payer: 'CLIENT' }).feeAmount
      ).toBe(0.04);
    });

    it('acepta montos Decimal y tasas con decimales', () => {
      expect(
        service.calculateFee(new Prisma.Decimal('1234.56'), {
          rate: 2.5,
          payer: 'PROVIDER',
        }).feeAmount
      ).toBe(30.86); // 30.864
    });

    it('tasa 0 no cobra nada', () => {
      expect(
        service.calculateFee(100, { rate: 0, payer: 'CLIENT' }).feeAmount
      ).toBe(0);
    });
  });

  describe('chargeProviderFee', () => {
    it('registra la comisión en el estado de cuenta en vez de debitar la billetera', async () => {
      await service.chargeProviderFee('ORDER', 'u1', 4.5, 'FEE-ORDER-1', {
        orderId: '1',
      });
      expect(billing.recordCharge).toHaveBeenCalledWith({
        type: 'ORDER',
        sellerUserId: 'u1',
        amount: 4.5,
        reference: 'FEE-ORDER-1',
        metadata: { orderId: '1' },
        collected: undefined,
      });
    });

    it('marca como cobrada la comisión retenida de una garantía', async () => {
      await service.chargeProviderFee(
        'SERVICE_REQUEST',
        'u1',
        2,
        'FEE-SVC-1',
        {},
        {
          collected: true,
        }
      );
      expect(billing.recordCharge).toHaveBeenCalledWith(
        expect.objectContaining({ collected: true })
      );
    });

    it('propaga el TransactionClient y devuelve si creó el cargo', async () => {
      const tx = { sellerCommissionCharge: {} } as any;
      await expect(
        service.chargeProviderFeeInTransaction(
          'SERVICE_REQUEST',
          'u1',
          2,
          'FEE-SVC-TX-1',
          { requestId: 'req-1' },
          { tx }
        )
      ).resolves.toEqual({ charge: { id: 'tx-charge' }, created: true });

      expect(billing.recordChargeInTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SERVICE_REQUEST',
          sellerUserId: 'u1',
          amount: 2,
          reference: 'FEE-SVC-TX-1',
        }),
        tx
      );
    });

    it('expone la notificación para ejecutarla después del commit', async () => {
      await service.notifyProviderFee({
        type: 'SERVICE_REQUEST',
        userId: 'u1',
        feeAmount: 2,
      });

      expect(billing.notifyChargeRecorded).toHaveBeenCalledWith({
        type: 'SERVICE_REQUEST',
        sellerUserId: 'u1',
        amount: 2,
        collected: undefined,
      });
    });

    it('una comisión en 0 no registra nada', async () => {
      await expect(
        service.chargeProviderFee('RIDE', 'u1', 0, 'FEE-RIDE-1', {})
      ).resolves.toBeNull();
      expect(billing.recordCharge).not.toHaveBeenCalled();
    });
  });

  describe('resolveFeeConfig', () => {
    it('devuelve la tasa Decimal de la DB como number', async () => {
      prisma.platformFeeRate.findFirst.mockResolvedValue({
        rate: new Prisma.Decimal('7.50000000'),
        payer: 'CLIENT',
      });
      const config = await service.resolveFeeConfig('SERVICE_REQUEST');
      expect(config).toEqual({ rate: 7.5, payer: 'CLIENT' });
    });

    it('el override por usuario tiene prioridad sobre la tasa global', async () => {
      prisma.platformFeeRate.findFirst.mockResolvedValue({
        rate: new Prisma.Decimal('10'),
        payer: 'CLIENT',
      });
      prisma.platformFeeOverride.findFirst.mockResolvedValue({
        rate: new Prisma.Decimal('2.25'),
        payer: null,
      });
      const config = await service.resolveFeeConfig('SERVICE_REQUEST', 'u1');
      expect(config).toEqual({ rate: 2.25, payer: 'CLIENT' });
    });
  });
});
