import { Body, Controller, Post } from '@nestjs/common';
import { BnplService } from './bnpl.service';
import { BnplWebhookDto } from './dto/bnpl-webhook.dto';

// Endpoints públicos de callback por proveedor: Cashea/Krece no tienen JWT de
// este sistema, así que no llevan JwtAuthGuard. La verificación de
// autenticidad del payload (firma HMAC o secreto compartido) queda como TODO
// explícito en BnplService.handleWebhook hasta tener las specs del proveedor.
@Controller('bnpl/webhooks')
export class BnplWebhookController {
  constructor(private readonly bnplService: BnplService) {}

  @Post('cashea')
  handleCasheaWebhook(@Body() payload: BnplWebhookDto) {
    return this.bnplService.handleWebhook('CASHEA', payload);
  }

  @Post('krece')
  handleKreceWebhook(@Body() payload: BnplWebhookDto) {
    return this.bnplService.handleWebhook('KRECE', payload);
  }
}
