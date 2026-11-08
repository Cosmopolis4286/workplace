import { BadRequestException, GoneException } from '@nestjs/common';
import { EscrowService } from '../../domains/money/escrow/escrow.service';
import { EscrowFundingService } from '../../domains/money/escrow-funding/escrow-funding.service';
import { FeaturesController } from '../../domains/platform/health/features.controller';

// Por defecto el Pago Protegido está apagado: la plataforma no retiene dinero
// nuevo de compradores (custodia de fondos de terceros).
describe('Pago Protegido apagado (por defecto)', () => {
  const previous = process.env.PROTECTED_PAYMENTS_ENABLED;
  beforeEach(() => {
    delete process.env.PROTECTED_PAYMENTS_ENABLED;
  });
  afterAll(() => {
    if (previous !== undefined)
      process.env.PROTECTED_PAYMENTS_ENABLED = previous;
  });

  it('GET /features lo informa apagado junto con BNPL y créditos', () => {
    expect(new FeaturesController().get()).toEqual({
      protectedPayments: false,
      bnpl: false,
      usageCredits: false,
    });
  });

  it('EscrowService.hold no mueve dinero ni crea la garantía', async () => {
    const wallets = { holdEscrow: jest.fn() };
    const prisma = { escrow: { findUnique: jest.fn(), upsert: jest.fn() } };
    const service = new EscrowService(prisma as any, wallets as any, {} as any);

    await expect(
      service.hold({
        entityType: 'SERVICE_REQUEST',
        entityId: 'sr-1',
        payerId: 'client',
        payeeId: 'provider',
        deltaAmount: 10,
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(wallets.holdEscrow).not.toHaveBeenCalled();
    expect(prisma.escrow.upsert).not.toHaveBeenCalled();
  });

  it('no se aceptan pagos nuevos de garantía a la plataforma', async () => {
    const prisma = { serviceRequest: { findUnique: jest.fn() } };
    const service = new EscrowFundingService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    await expect(
      service.reportServiceRequestPayment('client', 'sr-1', {
        platformAccountId: 'pa-1',
        reference: 'REF1',
        paidAt: new Date().toISOString(),
      } as any)
    ).rejects.toBeInstanceOf(GoneException);
    await expect(
      service.getServiceRequestOptions('client', 'sr-1')
    ).rejects.toBeInstanceOf(GoneException);
    expect(prisma.serviceRequest.findUnique).not.toHaveBeenCalled();
  });

  it('se enciende solo con PROTECTED_PAYMENTS_ENABLED=true', () => {
    process.env.PROTECTED_PAYMENTS_ENABLED = 'true';
    expect(new FeaturesController().get().protectedPayments).toBe(true);
    process.env.PROTECTED_PAYMENTS_ENABLED = '1';
    expect(new FeaturesController().get().protectedPayments).toBe(false);
  });
});
