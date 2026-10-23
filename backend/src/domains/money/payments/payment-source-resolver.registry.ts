import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  assertResolvedPaymentSource,
  PaymentSourceResolver,
  PaymentSourceType,
  ResolvedPaymentSource,
} from './payment-source-resolver.interface';

/**
 * Registry deliberately fails closed: a source type cannot initiate checkout
 * until its domain-specific resolver has been implemented and registered.
 */
@Injectable()
export class PaymentSourceResolverRegistry {
  private readonly resolvers = new Map<PaymentSourceType, PaymentSourceResolver>();

  constructor(resolvers: PaymentSourceResolver[] = []) {
    for (const resolver of resolvers) {
      if (this.resolvers.has(resolver.sourceType)) {
        throw new ConflictException(
          `Existe más de un resolver para ${resolver.sourceType}`
        );
      }
      this.resolvers.set(resolver.sourceType, resolver);
    }
  }

  async resolve(
    sourceType: PaymentSourceType,
    sourceId: string,
    payerUserId: string
  ): Promise<ResolvedPaymentSource> {
    if (!sourceId?.trim() || !payerUserId?.trim()) {
      throw new BadRequestException('El origen y el pagador son obligatorios');
    }

    const resolver = this.resolvers.get(sourceType);
    if (!resolver) {
      throw new BadRequestException(
        `El origen de pago ${sourceType} aún no está habilitado`
      );
    }

    const resolved = await resolver.resolve(sourceId, payerUserId);
    return assertResolvedPaymentSource(
      resolved,
      sourceType,
      sourceId,
      payerUserId
    );
  }
}
