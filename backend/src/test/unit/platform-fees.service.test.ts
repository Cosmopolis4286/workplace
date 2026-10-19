import { Prisma } from '@prisma/client';
import { PlatformFeesService } from '../../domains/money/platform-fees/platform-fees.service';

describe('PlatformFeesService', () => {
  const prisma = {
    platformFeeRate: { findFirst: jest.fn() },
    platformFeeOverride: { findFirst: jest.fn() },
    subscription: { findFirst: jest.fn() },
  };
  const wallets = { chargePlatformFee: jest.fn() };
  const notifications = {
    notifyPlatformFeeCharged: jest.fn().mockResolvedValue(undefined),
  };
  const service = new PlatformFeesService(
    prisma as any,
    wallets as any,
    notifications as any
  );

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
