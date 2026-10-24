import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  ExternalPaymentProvider,
  PlatformPaymentEnvironment,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface ResolvedPlatformPaymentRecipient {
  provider: ExternalPaymentProvider;
  currency: 'VES' | 'USD';
  environment: PlatformPaymentEnvironment;
  recipientReference: string;
  displayName: string | null;
}

/**
 * Resolves a platform-owned destination only when operations has explicitly
 * enabled and verified it. This does not assert that a provider supports a
 * payment method, checkout, split, or settlement currency.
 */
@Injectable()
export class PlatformPaymentRecipientService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(input: {
    provider: ExternalPaymentProvider;
    currency: string;
    environment: PlatformPaymentEnvironment;
  }): Promise<ResolvedPlatformPaymentRecipient> {
    const currency =
      typeof input.currency === 'string' ? input.currency.toUpperCase() : '';
    if (currency !== 'VES' && currency !== 'USD') {
      throw new ServiceUnavailableException(
        'No existe un destino de cobro habilitado para esta configuración',
      );
    }

    const recipient = await this.prisma.platformPaymentRecipient.findUnique({
      where: {
        provider_currency_environment: {
          provider: input.provider,
          currency,
          environment: input.environment,
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

    if (
      !recipient ||
      !recipient.isEnabled ||
      !recipient.verifiedAt ||
      !recipient.recipientReference.trim()
    ) {
      throw new ServiceUnavailableException(
        'No existe un destino de cobro habilitado para esta configuración',
      );
    }

    return {
      provider: recipient.provider,
      currency: recipient.currency as 'VES' | 'USD',
      environment: recipient.environment,
      recipientReference: recipient.recipientReference,
      displayName: recipient.displayName,
    };
  }
}
