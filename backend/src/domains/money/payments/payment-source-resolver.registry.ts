import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import {
  assertResolvedPaymentSource,
  PAYMENT_SOURCE_RESOLVERS,
  PaymentSourceResolver,
  PaymentSourceType,
  ResolvedPaymentSource,
} from './payment-source-resolver.interface';

@Injectable()
export class PaymentSourceResolverRegistry {
  private readonly resolvers = new Map<PaymentSourceType, PaymentSourceResolver>();

  constructor(
    @Optional()
    @Inject(PAYMENT_SOURCE_RESOLVERS)
    resolvers: PaymentSourceResolver[] = [],
  ) {
    for (const resolver of resolvers) {
      if (this.resolvers.has(resolver.sourceType)) {
        throw new ConflictException(
          `Existe más de un resolver para ${resolver.sourceType}`,
        );
      }
      this.resolvers.set(resolver.sourceType, resolver);
    }
  }

  async resolve(
    sourceType: PaymentSourceType,
    sourceId: string,
    payerUserId: string,
  ): Promise<ResolvedPaymentSource> {
    if (!sourceId?.trim() || !payerUserId?.trim()) {
      throw new BadRequestException('El origen y el pagador son obligatorios');
    }

    const resolver = this.resolvers.get(sourceType);
    if (!resolver) {
      throw new BadRequestException(
        `El origen de pago ${sourceType} aún no está habilitado`,
      );
    }

    const resolved = await resolver.resolve(sourceId, payerUserId);
    return assertResolvedPaymentSource(
      resolved,
      sourceType,
      sourceId,
      payerUserId,
    );
  }
}
