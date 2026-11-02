import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ManualPaymentReportStatus, Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  RateLimit,
  RateLimitGuard,
} from '../../../common/guards/rate-limit.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  RejectEscrowFundingDto,
  ReportEscrowFundingDto,
} from './dto/escrow-funding.dto';
import { EscrowFundingService } from './escrow-funding.service';

/** Pago de la garantía (Pago Protegido) de una operación a la plataforma. */
@Controller('escrow-funding')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
export class EscrowFundingController {
  constructor(private readonly funding: EscrowFundingService) {}

  @Get('service-requests/:id')
  options(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.funding.getServiceRequestOptions(user.id, id);
  }

  @Post('service-requests/:id/reports')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 10,
    keyGenerator: (req) => `escrow-funding:report:${(req as any).user?.id}`,
  })
  report(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportEscrowFundingDto
  ) {
    return this.funding.reportServiceRequestPayment(user.id, id, dto);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Get('admin/reports')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  list(@Query('status') status?: string) {
    const valid = Object.values(ManualPaymentReportStatus).includes(
      status as ManualPaymentReportStatus
    );
    return this.funding.list(
      valid ? (status as ManualPaymentReportStatus) : undefined
    );
  }

  // Confirmar dinero recibido por la plataforma: solo SUPERADMIN.
  @Post('admin/reports/:id/confirm')
  @Roles(Role.SUPERADMIN)
  confirm(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.funding.confirm(user.id, id);
  }

  @Post('admin/reports/:id/reject')
  @Roles(Role.SUPERADMIN)
  reject(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectEscrowFundingDto
  ) {
    return this.funding.reject(user.id, id, dto.reason);
  }
}
