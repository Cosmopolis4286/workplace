import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BnplService } from './bnpl.service';
import { BnplWebhookDto } from './dto/bnpl-webhook.dto';
import {
  RateLimitGuard,
  RateLimit,
} from '../../../common/guards/rate-limit.guard';

// Endpoints públicos de callback por proveedor: Cashea/Krece no tienen JWT de
// este sistema, así que no llevan JwtAuthGuard. La autenticidad del payload
// se valida con un secreto compartido por header (BnplService.
// verifyWebhookSecret) — mismo patrón que TelegramController.webhook. No es
// HMAC del proveedor real (no hay specs todavía), pero evita que cualquiera
// en internet dispare estos endpoints sin más.
@Controller('bnpl')
export class BnplWebhookController {
  constructor(
    private readonly bnplService: BnplService,
    private readonly config: ConfigService
  ) {}

  @Post('webhooks/cashea')
  @HttpCode(200)
  handleCasheaWebhook(
    @Body() payload: BnplWebhookDto,
    @Headers('x-bnpl-webhook-secret') secret: string | undefined
  ) {
    if (!this.bnplService.verifyWebhookSecret('CASHEA', secret)) {
      throw new UnauthorizedException();
    }
    return this.bnplService.handleWebhook('CASHEA', payload);
  }

  @Post('webhooks/krece')
  @HttpCode(200)
  handleKreceWebhook(
    @Body() payload: BnplWebhookDto,
    @Headers('x-bnpl-webhook-secret') secret: string | undefined
  ) {
    if (!this.bnplService.verifyWebhookSecret('KRECE', secret)) {
      throw new UnauthorizedException();
    }
    return this.bnplService.handleWebhook('KRECE', payload);
  }

  // Solo para desarrollo/pruebas mientras no hay credenciales reales: la
  // página pública frontend/pages/bnpl/simulated/[ref].vue la llama sin auth
  // (el cliente final no tiene sesión de este sistema). Bloqueado por
  // completo en producción; en dev/staging queda mitigado por: (1) el
  // externalReference es un UUID impredecible (SimulatedAdapter.initiate),
  // (2) solo puede resolver transacciones aún PENDING (BnplService.
  // simulateResolve — no permite revertir una ya cerrada), (3) rate limit
  // para dificultar fuerza bruta del UUID.
  @Post('simulate/:externalReference/resolve')
  @UseGuards(RateLimitGuard)
  @RateLimit({ windowMs: 60_000, maxRequests: 10 })
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
