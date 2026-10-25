import { ServiceUnavailableException } from '@nestjs/common';
import {
  ExternalPaymentProvider,
  PlatformPaymentEnvironment,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PlatformPaymentRecipientService } from './platform-payment-recipient.service';

describe('PlatformPaymentRecipientService', () => {
  const prisma = {
    platformPaymentRecipient: { findUnique: jest.fn() },
  } as unknown as PrismaService;
  let service: PlatformPaymentRecipientService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformPaymentRecipientService(prisma);
    (prisma.platformPaymentRecipient.findUnique as jest.Mock).mockResolvedValue(
      {
        provider: ExternalPaymentProvider.VEXPAY,
        currency: 'USD',
        environment: PlatformPaymentEnvironment.SANDBOX,
        recipientReference: 'merchant-account-reference',
        displayName: 'WorkPlace',
        isEnabled: true,
        verifiedAt: new Date('2026-10-24T12:00:00.000Z'),
      }
    );
  });

  it('resolves the configured, enabled, verified destination', async () => {
    await expect(
      service.resolve({
        provider: ExternalPaymentProvider.VEXPAY,
        currency: 'usd',
        environment: PlatformPaymentEnvironment.SANDBOX,
      })
    ).resolves.toEqual({
      provider: ExternalPaymentProvider.VEXPAY,
      currency: 'USD',
      environment: PlatformPaymentEnvironment.SANDBOX,
      recipientReference: 'merchant-account-reference',
      displayName: 'WorkPlace',
    });

    expect(prisma.platformPaymentRecipient.findUnique).toHaveBeenCalledWith({
      where: {
        provider_currency_environment: {
          provider: ExternalPaymentProvider.VEXPAY,
          currency: 'USD',
          environment: PlatformPaymentEnvironment.SANDBOX,
        },
      },
      select: {
        provider: true,
        currency: true,
        environment: true,
        recipientReference: true,
        displayName: true,
        isEnabled: true,
        verifiedAt: true,
      },
    });
  });

  it.each([
    { isEnabled: false },
    { verifiedAt: null },
    { recipientReference: '  ' },
  ])(
    'fails closed when the recipient is not verified and usable: %o',
    async (patch) => {
      (
        prisma.platformPaymentRecipient.findUnique as jest.Mock
      ).mockResolvedValue({
        provider: ExternalPaymentProvider.VEXPAY,
        currency: 'USD',
        environment: PlatformPaymentEnvironment.SANDBOX,
        recipientReference: 'merchant-account-reference',
        displayName: 'WorkPlace',
        isEnabled: true,
        verifiedAt: new Date('2026-10-24T12:00:00.000Z'),
        ...patch,
      });

      await expect(
        service.resolve({
          provider: ExternalPaymentProvider.VEXPAY,
          currency: 'USD',
          environment: PlatformPaymentEnvironment.SANDBOX,
        })
      ).rejects.toThrow(ServiceUnavailableException);
    }
  );

  it('fails closed when no destination is configured', async () => {
    (prisma.platformPaymentRecipient.findUnique as jest.Mock).mockResolvedValue(
      null
    );

    await expect(
      service.resolve({
        provider: ExternalPaymentProvider.VEXPAY,
        currency: 'USD',
        environment: PlatformPaymentEnvironment.PRODUCTION,
      })
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('rejects unsupported currencies without querying the database', async () => {
    await expect(
      service.resolve({
        provider: ExternalPaymentProvider.VEXPAY,
        currency: 'EUR',
        environment: PlatformPaymentEnvironment.SANDBOX,
      })
    ).rejects.toThrow(ServiceUnavailableException);

    expect(prisma.platformPaymentRecipient.findUnique).not.toHaveBeenCalled();
  });
});
