import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsageCreditsService } from '../../domains/money/usage-credits/usage-credits.service';
import { InsufficientUsageCreditsError } from '../../domains/money/usage-credits/usage-credits.facade';
import { leadFeeUnits } from '../../domains/money/usage-credits/usage-credits.constants';

const D = (v: number | string) => new Prisma.Decimal(v);
const USER = 'user-1';

function lot(overrides: Partial<any>) {
  return {
    id: 'lot',
    userId: USER,
    kind: 'PURCHASED',
    units: D(10),
    remaining: D(10),
    expiresAt: null,
    createdAt: new Date('2026-11-01T00:00:00Z'),
    ...overrides,
  };
}

describe('UsageCreditsService', () => {
  const previous = process.env.USAGE_CREDITS_ENABLED;
  let prisma: any;
  let notifications: any;
  let rates: any;
  let service: UsageCreditsService;

  beforeEach(() => {
    process.env.USAGE_CREDITS_ENABLED = 'true';
    prisma = {
      usageCreditEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(({ data }: any) =>
          Promise.resolve({ id: `ev-${data.reference}`, ...data })
        ),
      },
      usageCreditLot: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(({ data }: any) =>
          Promise.resolve({ id: `lot-${data.kind}`, ...data })
        ),
      },
      usageCreditMovement: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      usageCreditPurchase: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { priceUsd: null } }),
        create: jest.fn(({ data }: any) => Promise.resolve(data)),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'pur-1',
          userId: USER,
          units: D(20),
          reference: 'REF1234',
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      platformCollectionAccount: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'acc-1',
          method: 'PAGO_MOVIL',
          currency: 'USD',
          bankCode: '0102',
          bankName: 'Banco',
          holderName: 'WorkPlace',
          holderDocument: 'J-123',
          phone: '0414',
          accountNumber: null,
          email: null,
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn((cb: (tx: any) => unknown) => cb(prisma)),
    };
    notifications = { createForUser: jest.fn().mockResolvedValue({}) };
    rates = { resolveRateToUsd: jest.fn() };
    service = new UsageCreditsService(prisma, notifications, rates);
  });

  afterAll(() => {
    if (previous === undefined) delete process.env.USAGE_CREDITS_ENABLED;
    else process.env.USAGE_CREDITS_ENABLED = previous;
  });

  describe('interruptor', () => {
    it('apagado: las rutas de usuario y admin responden 404', async () => {
      delete process.env.USAGE_CREDITS_ENABLED;
      await expect(service.getMine(USER)).rejects.toBeInstanceOf(
        NotFoundException
      );
      await expect(service.getPackages()).rejects.toBeInstanceOf(
        NotFoundException
      );
      await expect(
        service.confirmPurchase('admin', 'pur-1')
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('consume', () => {
    it('usa primero los promocionales que vencen antes y luego los comprados (FIFO)', async () => {
      prisma.usageCreditLot.findMany.mockResolvedValue([
        lot({ id: 'compra-vieja', remaining: D(5) }),
        lot({
          id: 'promo-tarde',
          kind: 'PROMOTIONAL',
          remaining: D(1),
          expiresAt: new Date('2027-02-01'),
        }),
        lot({
          id: 'promo-pronto',
          kind: 'PROMOTIONAL',
          remaining: D(1),
          expiresAt: new Date('2026-12-01'),
        }),
      ]);

      const result = await service.consume(prisma, {
        userId: USER,
        units: 3,
        concept: 'SUCCESS_FEE',
        reference: 'FEE-SVC-1',
      });

      expect(result).toEqual({ applied: true });
      const taken = prisma.usageCreditLot.update.mock.calls.map(([a]: any) => [
        a.where.id,
        a.data.remaining.decrement.toString(),
      ]);
      expect(taken).toEqual([
        ['promo-pronto', '1'],
        ['promo-tarde', '1'],
        ['compra-vieja', '1'],
      ]);
      // Bloquea los lotes del usuario antes de leer el saldo.
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.usageCreditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reference: 'FEE-SVC-1' }),
        })
      );
    });

    it('sin saldo suficiente falla entero, sin tocar lotes ni crear el evento', async () => {
      prisma.usageCreditLot.findMany.mockResolvedValue([
        lot({ remaining: D('0.40') }),
      ]);
      await expect(
        service.consume(prisma, {
          userId: USER,
          units: D('0.50'),
          concept: 'LEAD_FEE',
          reference: 'LEAD-SVC-1',
        })
      ).rejects.toBeInstanceOf(InsufficientUsageCreditsError);
      expect(prisma.usageCreditLot.update).not.toHaveBeenCalled();
      expect(prisma.usageCreditEvent.create).not.toHaveBeenCalled();
    });

    it('un reintento con la misma referencia no cobra dos veces', async () => {
      prisma.usageCreditEvent.findUnique.mockResolvedValue({ id: 'ev-1' });
      const result = await service.consume(prisma, {
        userId: USER,
        units: 1,
        concept: 'LEAD_FEE',
        reference: 'LEAD-SVC-1',
      });
      expect(result).toEqual({ applied: false });
      expect(prisma.usageCreditLot.update).not.toHaveBeenCalled();
    });
  });

  describe('reverse', () => {
    it('devuelve cada parte a su lote con un movimiento compensatorio, una sola vez', async () => {
      prisma.usageCreditEvent.findUnique
        .mockResolvedValueOnce({
          id: 'ev-1',
          userId: USER,
          movements: [
            { lotId: 'promo', units: D(-1) },
            { lotId: 'compra', units: D('-0.5') },
          ],
        })
        .mockResolvedValueOnce(null);

      const result = await service.reverse(prisma, {
        reference: 'FEE-SVC-1',
        reason: 'Servicio cancelado',
      });

      expect(result).toEqual({ applied: true });
      expect(prisma.usageCreditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reference: 'REVERSAL-FEE-SVC-1' }),
        })
      );
      const restored = prisma.usageCreditLot.update.mock.calls.map(
        ([a]: any) => [a.where.id, a.data.remaining.increment.toString()]
      );
      expect(restored).toEqual([
        ['promo', '1'],
        ['compra', '0.5'],
      ]);
    });
  });

  describe('compras', () => {
    const dto = {
      packageCode: 'P20',
      platformAccountId: '11111111-1111-4111-8111-111111111111',
      reference: 'ref 1234',
      paidAt: new Date().toISOString(),
    };

    it('registra la compra en revisión con el monto a pagar y la cuenta copiada', async () => {
      const created: any = await service.reportPurchase(USER, dto as any);
      expect(created).toMatchObject({
        userId: USER,
        packageCode: 'P20',
        reference: 'REF1234',
        paidCurrency: 'USD',
      });
      expect(created.units.toString()).toBe('20');
      expect(created.destination).toMatchObject({ holderDocument: 'J-123' });
    });

    it('respeta el tope mensual de compras', async () => {
      prisma.usageCreditPurchase.aggregate.mockResolvedValue({
        _sum: { priceUsd: D(190) },
      });
      await expect(
        service.reportPurchase(USER, dto as any)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.usageCreditPurchase.create).not.toHaveBeenCalled();
    });

    it('no acepta una referencia ya reportada', async () => {
      prisma.usageCreditPurchase.findFirst.mockResolvedValue({ id: 'otra' });
      await expect(
        service.reportPurchase(USER, dto as any)
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('la primera compra confirmada recibe el bono de bienvenida (20 %, vence)', async () => {
      const result = await service.confirmPurchase('admin', 'pur-1');
      expect(result.bonus.toString()).toBe('4');
      const kinds = prisma.usageCreditLot.create.mock.calls.map(
        ([a]: any) => a.data.kind
      );
      expect(kinds).toEqual(['PURCHASED', 'PROMOTIONAL']);
      const promo = prisma.usageCreditLot.create.mock.calls[1][0].data;
      expect(promo.expiresAt).toBeInstanceOf(Date);
      // El bono se identifica por usuario: no se puede otorgar dos veces.
      expect(prisma.usageCreditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reference: `WELCOME-BONUS-${USER}` }),
        })
      );
    });

    it('las compras siguientes no reciben bono', async () => {
      prisma.usageCreditPurchase.count.mockResolvedValue(1);
      const result = await service.confirmPurchase('admin', 'pur-1');
      expect(result.bonus.toString()).toBe('0');
      expect(prisma.usageCreditLot.create).toHaveBeenCalledTimes(1);
    });

    it('dos confirmaciones simultáneas: la segunda no acredita', async () => {
      prisma.usageCreditPurchase.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.confirmPurchase('admin', 'pur-1')
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.usageCreditLot.create).not.toHaveBeenCalled();
    });
  });

  describe('vencimiento', () => {
    it('vence los promocionales caducados con un movimiento EXPIRE', async () => {
      prisma.usageCreditLot.findMany.mockResolvedValue([
        lot({ id: 'promo', kind: 'PROMOTIONAL', remaining: D(2) }),
      ]);
      const result = await service.expirePromotional(new Date());
      expect(result).toEqual({ expired: 1 });
      expect(prisma.usageCreditMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'EXPIRE' }),
        })
      );
    });
  });

  it('cargo por oportunidad escalonado según el precio del servicio', () => {
    expect(leadFeeUnits(5).toString()).toBe('0.25');
    expect(leadFeeUnits(30).toString()).toBe('0.5');
    expect(leadFeeUnits(120).toString()).toBe('1');
    expect(leadFeeUnits(null).toString()).toBe('0.25');
  });
});
