import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PAYMENT_SOURCE_RESOLVERS } from './payment-source-resolver.interface';
import { PaymentSourceResolverRegistry } from './payment-source-resolver.registry';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentSourceResolverRegistry,
    // Intentionally empty until a domain resolver is fully tested and approved.
    { provide: PAYMENT_SOURCE_RESOLVERS, useValue: [] },
  ],
  exports: [PaymentsService, PaymentSourceResolverRegistry],
})
export class PaymentsModule {}
