import {
  Body,
  Controller,
  Get,
  GoneException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { join } from 'path';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { WalletEnabledGuard } from '../../../common/guards/wallet-enabled.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  RateLimitGuard,
  RateLimit,
} from '../../../common/guards/rate-limit.guard';
import { WalletDepositRequestsService } from './wallet-deposit-requests.service';
import { ReviewDepositRequestDto } from './dto/review-deposit-request.dto';

// Fuera de "uploads/" (público) por la misma razón que KYC — el comprobante
// puede tener datos bancarios/personales, solo se sirve autenticado.
const DEPOSIT_PROOF_DIR = join(
  process.cwd(),
  'private-uploads',
  'wallet-deposit-proofs'
);

@UseGuards(WalletEnabledGuard, JwtAuthGuard, RolesGuard, RateLimitGuard)
@Controller('wallet-deposit-requests')
export class WalletDepositRequestsController {
  constructor(private readonly service: WalletDepositRequestsService) {}

  @Get('mine')
  getMine(@CurrentUser() user: any) {
    return this.service.getMine(user.id);
  }

  // La billetera ya no se recarga (Pago Protegido se paga por operación en
  // money/escrow-funding). Las solicitudes ya enviadas se siguen revisando.
  @Post()
  create() {
    throw new GoneException(
      'La billetera ya no se recarga: la garantía de Pago Protegido se paga en cada solicitud'
    );
  }

  // Comprobante — dueño o admin, autenticado (misma razón que KYC).
  @Get(':id/proof-image')
  async getProofImage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response
  ) {
    const filename = await this.service.resolveImageFilename(
      id,
      user.id,
      user.role
    );
    return res.sendFile(filename, { root: DEPOSIT_PROOF_DIR });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  @Get('admin/pending')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAllPending(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.findAllPending(parseInt(page, 10), parseInt(limit, 10));
  }

  @Patch('admin/:id/review')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 30,
    keyGenerator: (req) => `deposit-req:review:${(req as any).user?.id}`,
  })
  review(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReviewDepositRequestDto
  ) {
    return this.service.review(id, user.id, user.role, dto);
  }
}
