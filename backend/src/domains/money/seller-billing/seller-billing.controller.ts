import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ManualPaymentReportStatus,
  Role,
  SellerStatementStatus,
} from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RateLimit } from '../../../common/guards/rate-limit.guard';
import { CreateSellerPaymentAccountDto } from '../payments/dto/seller-payment-account.dto';
import {
  RejectStatementPaymentDto,
  ReportStatementPaymentDto,
  SetActiveDto,
} from './dto/seller-billing.dto';
import { SellerBillingService } from './seller-billing.service';

const pick = <T extends string>(values: Record<string, T>, v?: string) =>
  Object.values(values).includes(v as T) ? (v as T) : undefined;

/** Estado de cuenta del vendedor: comisiones semanales y su pago. */
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class SellerBillingController {
  constructor(private readonly billing: SellerBillingService) {}

  @Get('me')
  mySummary(@CurrentUser() user: { id: string }) {
    return this.billing.getMySummary(user.id);
  }

  @Get('statements/:id/payment-options')
  paymentOptions(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.billing.getPaymentOptions(user.id, id);
  }

  @Post('statements/:id/payments')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 10,
    keyGenerator: (req) => `billing:report:${(req as any).user?.id}`,
  })
  reportPayment(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportStatementPaymentDto
  ) {
    return this.billing.reportPayment(user.id, id, dto);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Get('admin/statements')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  statements(@Query('status') status?: string) {
    return this.billing.listStatements(pick(SellerStatementStatus, status));
  }

  @Get('admin/payments')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  payments(@Query('status') status?: string) {
    return this.billing.listPayments(pick(ManualPaymentReportStatus, status));
  }

  // Confirmar dinero recibido por la plataforma: solo SUPERADMIN, igual que el
  // resto de operaciones de dinero con impacto real.
  @Post('admin/payments/:id/confirm')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  confirm(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.billing.confirmPayment(user.id, id);
  }

  @Post('admin/payments/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  reject(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectStatementPaymentDto
  ) {
    return this.billing.rejectPayment(user.id, id, dto.reason);
  }

  @Get('admin/collection-accounts')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  collectionAccounts() {
    return this.billing.listPlatformAccounts();
  }

  @Post('admin/collection-accounts')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  createCollectionAccount(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSellerPaymentAccountDto
  ) {
    return this.billing.createPlatformAccount(user.id, dto);
  }

  @Patch('admin/collection-accounts/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  setCollectionAccountActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetActiveDto
  ) {
    return this.billing.setPlatformAccountActive(id, dto.isActive);
  }

  @Delete('admin/collection-accounts/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  removeCollectionAccount(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.removePlatformAccount(id);
  }
}
