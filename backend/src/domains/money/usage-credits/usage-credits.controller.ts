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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { KycApprovedGuard } from '../../../common/guards/kyc-approved.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  RateLimit,
  RateLimitGuard,
} from '../../../common/guards/rate-limit.guard';
import { UsageCreditsService } from './usage-credits.service';
import {
  RejectUsageCreditPurchaseDto,
  ReportUsageCreditPurchaseDto,
} from './dto/usage-credits.dto';

// Todas las rutas responden 404 mientras USAGE_CREDITS_ENABLED esté apagado.
@Controller('usage-credits')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
export class UsageCreditsController {
  constructor(private readonly credits: UsageCreditsService) {}

  @Get('packages')
  packages() {
    return this.credits.getPackages();
  }

  @Get('me')
  mine(@CurrentUser() user: { id: string }) {
    return this.credits.getMine(user.id);
  }

  // Comprar exige identidad verificada (prevención de legitimación de capitales).
  @Post('purchases')
  @UseGuards(KycApprovedGuard)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 5,
    keyGenerator: (req) => `usage-credits:purchase:${(req as any).user?.id}`,
  })
  report(
    @CurrentUser() user: { id: string },
    @Body() dto: ReportUsageCreditPurchaseDto
  ) {
    return this.credits.reportPurchase(user.id, dto);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Get('admin/purchases')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  list(@Query('status') status?: ManualPaymentReportStatus) {
    const valid = Object.values(ManualPaymentReportStatus).includes(
      status as ManualPaymentReportStatus
    );
    return this.credits.listPurchases(valid ? status : undefined);
  }

  @Post('admin/purchases/:id/confirm')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  confirm(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.credits.confirmPurchase(user.id, id);
  }

  @Post('admin/purchases/:id/reject')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  reject(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectUsageCreditPurchaseDto
  ) {
    return this.credits.rejectPurchase(user.id, id, dto.reason);
  }
}
