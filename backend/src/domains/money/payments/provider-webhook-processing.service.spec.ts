import { ConflictException } from '@nestjs/common';
import { ExternalPaymentProvider, ExternalPaymentStatus } from '@prisma/client';
import { ProviderWebhookProcessingService } from './provider-webhook-processing.service';

describe('ProviderWebhookProcessingService', () => {
  const event = {
    provider: ExternalPaymentProvider.VEXPAY,
    providerEventId: 'evt-1',
    eventType: 'payment.succeeded',
    paymentIntentId: 'intent-1',
    status: ExternalPaymentStatus.SUCCEEDED,
    signatureVerified: true as const,
    payload: { id: 'evt-1' },
  };

  function setup(overrides: Record<string, any> = {}) {
    const recorded = {
      id: 'webhook-1',
      status: 'RECEIVED',
      ...overrides.recorded,
    };
    const prisma = {
      externalPaymentWebhookEvent: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(recorded),
        update: jest.fn().mockImplementation(async ({ data }) => ({
          ...recorded,
          ...data,
        })),
      },
      externalPaymentIntent: {
        findFirst: jest.fn().mockResolvedValue({ id: 'intent-1' }),
      },
    } as any;
    const paymentsService = {
      recordVerifiedWebhook: jest.fn().mockResolvedValue(recorded),
      transitionIntent: jest.fn().mockResolvedValue({ id: 'intent-1' }),
    } as any;
    return {
      service: new ProviderWebhookProcessingService(prisma, paymentsService),
      prisma,
      paymentsService,
      recorded,
    };
  }

  it('applies a verified normalized event and marks it processed', async () => {
    const { service, prisma, paymentsService } = setup();

    const result = await service.process(event);

    expect(paymentsService.recordVerifiedWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: event.provider,
        providerEventId: event.providerEventId,
        signatureVerified: true,
      })
    );
    expect(prisma.externalPaymentIntent.findFirst).toHaveBeenCalledWith({
      where: { provider: event.provider, id: event.paymentIntentId },
    });
    expect(paymentsService.transitionIntent).toHaveBeenCalledWith(
      'intent-1',
      ExternalPaymentStatus.SUCCEEDED,
      event.eventType
    );
    expect(result.status).toBe('PROCESSED');
  });

  it('does not process a duplicate event that is already processed', async () => {
    const { service, paymentsService, prisma } = setup({
      recorded: { status: 'PROCESSED' },
    });

    const result = await service.process(event);

    expect(result.status).toBe('PROCESSED');
    expect(prisma.externalPaymentIntent.findFirst).not.toHaveBeenCalled();
    expect(paymentsService.transitionIntent).not.toHaveBeenCalled();
  });

  it('does not process an event already claimed by another worker', async () => {
    const { service, prisma, paymentsService, recorded } = setup();
    prisma.externalPaymentWebhookEvent.updateMany.mockResolvedValue({ count: 0 });
    prisma.externalPaymentWebhookEvent.findUnique.mockResolvedValue({
      ...recorded,
      status: 'PROCESSING',
    });

    const result = await service.process(event);

    expect(result.status).toBe('PROCESSING');
    expect(prisma.externalPaymentIntent.findFirst).not.toHaveBeenCalled();
    expect(paymentsService.transitionIntent).not.toHaveBeenCalled();
  });

  it('reclaims a failed event for a retry', async () => {
    const { service, prisma } = setup({ recorded: { status: 'FAILED' } });

    const result = await service.process(event);

    expect(prisma.externalPaymentWebhookEvent.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'webhook-1',
        status: { in: ['RECEIVED', 'FAILED'] },
      },
      data: { status: 'PROCESSING', processingError: null },
    });
    expect(result.status).toBe('PROCESSED');
  });

  it('marks events without a matching payment as ignored', async () => {
    const { service, prisma, paymentsService } = setup();
    prisma.externalPaymentIntent.findFirst.mockResolvedValue(null);

    const result = await service.process(event);

    expect(result.status).toBe('IGNORED');
    expect(paymentsService.transitionIntent).not.toHaveBeenCalled();
  });

  it('rejects events that are not signature verified', async () => {
    const { service, paymentsService } = setup();

    await expect(
      service.process({ ...event, signatureVerified: false } as any)
    ).rejects.toThrow(ConflictException);
    expect(paymentsService.recordVerifiedWebhook).not.toHaveBeenCalled();
  });

  it('does not retry an invalid state transition forever', async () => {
    const { service, prisma, paymentsService } = setup();
    paymentsService.transitionIntent.mockRejectedValue(
      new ConflictException('invalid transition')
    );

    const result = await service.process(event);

    expect(result.status).toBe('IGNORED');
    expect(prisma.externalPaymentWebhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'IGNORED' }),
      })
    );
  });
});
