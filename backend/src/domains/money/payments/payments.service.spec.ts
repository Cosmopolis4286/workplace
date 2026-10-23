import {
  ExternalCommissionCollectionMode,
  ExternalPaymentProvider,
  ExternalSettlementMode,
  FeePayer,
} from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const makeInput = (
    overrides: Partial<{
      currency: 'VES' | 'USD';
      commissionPayer: FeePayer;
      settlementMode: ExternalSettlementMode;
      collectionMode: ExternalCommissionCollectionMode;
    }> = {}
  ) => ({
    idempotencyKey: 'order-1-attempt-1',
    sourceType: 'ORDER',
    sourceId: 'order-1',
    payerUserId: 'buyer-1',
    sellerUserId: 'seller-1',
    provider: ExternalPaymentProvider.VEXPAY,
    currency: 'USD' as const,
    baseAmount: '100.00',
    commissionRateBps: 800,
    commissionPayer: FeePayer.PROVIDER,
    settlementMode: ExternalSettlementMode.DIRECT_TO_SELLER,
    collectionMode: ExternalCommissionCollectionMode.PERIODIC_INVOICE,
    ...overrides,
  });

  it('rejects unsupported currencies before touching the database', async () => {
    const prisma = {} as any;
    const service = new PaymentsService(prisma);

    await expect(
      service.prepareIntent(makeInput({ currency: 'EUR' as any }))
    ).rejects.toThrow('Moneda no admitida');
  });

  it('rejects a split configuration that claims unsupported automatic collection', async () => {
    const prisma = {} as any;
    const service = new PaymentsService(prisma);

    await expect(
      service.prepareIntent(
        makeInput({
          settlementMode: ExternalSettlementMode.DIRECT_TO_SELLER,
          collectionMode: ExternalCommissionCollectionMode.AUTOMATIC_SPLIT,
        })
      )
    ).rejects.toThrow('El cobro automático requiere split');
  });

  it('calculates provider-paid commission using decimal arithmetic', async () => {
    const intent = { id: 'intent-1' };
    const tx = {
      externalPaymentIntent: {
        create: jest.fn().mockResolvedValue(intent),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...intent,
          amount: '100.00',
          commissionAmount: '8.00',
          sellerNetAmount: '92.00',
          commission: { feeAmount: '8.00' },
        }),
      },
      externalPaymentCommission: {
        create: jest.fn().mockResolvedValue({ id: 'commission-1' }),
      },
    };
    const prisma = {
      externalPaymentIntent: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(tx)),
    } as any;
    const service = new PaymentsService(prisma);

    const result = await service.prepareIntent(makeInput());

    expect(tx.externalPaymentIntent.create).toHaveBeenCalledTimes(1);
    const created = tx.externalPaymentIntent.create.mock.calls[0][0].data;
    expect(created.amount.toFixed(2)).toBe('100.00');
    expect(created.commissionAmount.toFixed(2)).toBe('8.00');
    expect(created.sellerNetAmount.toFixed(2)).toBe('92.00');
    expect(result).toBeDefined();
  });

  it('adds client-paid commission to the checkout amount', async () => {
    const tx = {
      externalPaymentIntent: {
        create: jest.fn().mockResolvedValue({ id: 'intent-2' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'intent-2' }),
      },
      externalPaymentCommission: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      externalPaymentIntent: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(tx)),
    } as any;
    const service = new PaymentsService(prisma);

    await service.prepareIntent(
      makeInput({ commissionPayer: FeePayer.CLIENT })
    );

    const created = tx.externalPaymentIntent.create.mock.calls[0][0].data;
    expect(created.amount.toFixed(2)).toBe('108.00');
    expect(created.commissionAmount.toFixed(2)).toBe('8.00');
    expect(created.sellerNetAmount.toFixed(2)).toBe('100.00');
  });
});
