import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PAYMENT_SOURCE_RESOLVERS } from './payment-source-resolver.interface';
import { PaymentSourceResolverRegistry } from './payment-source-resolver.registry';
import { CatalogOrderPaymentSourceResolver } from './catalog-order-payment-source.resolver';
import { ServiceRequestPaymentSourceResolver } from './service-request-payment-source.resolver';
import { PlatformPaymentRecipientService } from './platform-payment-recipient.service';
import { ProviderWebhookProcessingService } from './provider-webhook-processing.service';
import { NotificationsModule } from '../../engagement/notifications/notifications.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { SellerPaymentAccountsService } from './manual/seller-payment-accounts.service';
import { ManualPaymentsService } from './manual/manual-payments.service';
import { ManualPaymentsController } from './manual/manual-payments.controller';

@Module({
  imports: [PrismaModule, NotificationsModule, ExchangeRatesModule],
  controllers: [PaymentsController, ManualPaymentsController],
  providers: [
    PaymentsService,
    PaymentSourceResolverRegistry,
    CatalogOrderPaymentSourceResolver,
    ServiceRequestPaymentSourceResolver,
    PlatformPaymentRecipientService,
    ProviderWebhookProcessingService,
    SellerPaymentAccountsService,
    ManualPaymentsService,
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
  exports: [
    PaymentsService,
    PaymentSourceResolverRegistry,
    PlatformPaymentRecipientService,
    ProviderWebhookProcessingService,
  ],
})
export class PaymentsModule {}
