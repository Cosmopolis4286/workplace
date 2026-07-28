import { Body, Controller, Param, Post } from '@nestjs/common';
import { BnplService } from './bnpl.service';
import { BnplWebhookDto } from './dto/bnpl-webhook.dto';

// Endpoints públicos de callback por proveedor: Cashea/Krece no tienen JWT de
// este sistema, así que no llevan JwtAuthGuard. La verificación de
// autenticidad del payload (firma HMAC o secreto compartido) queda como TODO
// explícito en BnplService.handleWebhook hasta tener las specs del proveedor.
@Controller('bnpl')
export class BnplWebhookController {
  constructor(private readonly bnplService: BnplService) {}

  @Post('webhooks/cashea')
  handleCasheaWebhook(@Body() payload: BnplWebhookDto) {
    return this.bnplService.handleWebhook('CASHEA', payload);
  }

  @Post('webhooks/krece')
  handleKreceWebhook(@Body() payload: BnplWebhookDto) {
    return this.bnplService.handleWebhook('KRECE', payload);
  }

  // Solo para desarrollo/pruebas mientras no hay credenciales reales: la
  // página pública frontend/pages/bnpl/simulated/[ref].vue la llama sin auth
  // (el cliente final no tiene sesión de este sistema).
  @Post('simulate/:externalReference/resolve')
  simulateResolve(
    @Param('externalReference') externalReference: string,
    @Body('status') status: 'APPROVED' | 'REJECTED'
  ) {
    return this.bnplService.simulateResolve(externalReference, status);
  }
}
