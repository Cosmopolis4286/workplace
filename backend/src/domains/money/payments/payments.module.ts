import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PAYMENT_SOURCE_RESOLVERS } from './payment-source-resolver.interface';
import { PaymentSourceResolverRegistry } from './payment-source-resolver.registry';
import { CatalogOrderPaymentSourceResolver } from './catalog-order-payment-source.resolver';
import { ServiceRequestPaymentSourceResolver } from './service-request-payment-source.resolver';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentSourceResolverRegistry,
    CatalogOrderPaymentSourceResolver,
    ServiceRequestPaymentSourceResolver,
    {
      provide: PAYMENT_SOURCE_RESOLVERS,
      useFactory: (
        catalogOrderResolver: CatalogOrderPaymentSourceResolver,
        serviceRequestResolver: ServiceRequestPaymentSourceResolver
      ) => [catalogOrderResolver, serviceRequestResolver],
      inject: [
        CatalogOrderPaymentSourceResolver,
        ServiceRequestPaymentSourceResolver,
      ],
    },
  ],
  exports: [PaymentsService, PaymentSourceResolverRegistry],
})
export class PaymentsModule {}
