import { Body, Controller, ForbiddenException, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BnplService } from './bnpl.service';
import { BnplWebhookDto } from './dto/bnpl-webhook.dto';

// Endpoints públicos de callback por proveedor: Cashea/Krece no tienen JWT de
// este sistema, así que no llevan JwtAuthGuard. La verificación de
// autenticidad del payload (firma HMAC o secreto compartido) queda como TODO
// explícito en BnplService.handleWebhook hasta tener las specs del proveedor.
@Controller('bnpl')
export class BnplWebhookController {
  constructor(
    private readonly bnplService: BnplService,
    private readonly config: ConfigService
  ) {}

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
  // (el cliente final no tiene sesión de este sistema). Bloqueado por
  // completo en producción: mientras los adapters "reales" de Cashea/Krece
  // sigan delegando al simulador (ver cashea.adapter.ts/krece.adapter.ts),
  // dejar esto accesible sin auth en prod permitiría marcar cualquier pedido
  // BNPL como pagado sin que ningún proveedor de crédito real intervenga.
  @Post('simulate/:externalReference/resolve')
  simulateResolve(
    @Param('externalReference') externalReference: string,
    @Body('status') status: 'APPROVED' | 'REJECTED'
  ) {
    if (this.config.get('APP_ENV') === 'production') {
      throw new ForbiddenException('Solo disponible en desarrollo');
    }
    return this.bnplService.simulateResolve(externalReference, status);
  }
}
