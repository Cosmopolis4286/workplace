import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { protectedPaymentsEnabled } from '../../../common/config/protected-payments';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Qué modos de pago ofrece la plataforma (la UI esconde lo apagado).
  @Get('features')
  features() {
    return { protectedPayments: protectedPaymentsEnabled() };
  }

  // Creation is intentionally internal until every source type has a
  // server-side price and ownership resolver. This endpoint is read-only.
  @Get('intents/:id')
  getIntent(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.paymentsService.getIntentForUser(id, user.id);
  }
}
