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
import { ManualPaymentReportStatus } from '@prisma/client';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { KycApprovedGuard } from '../../../../common/guards/kyc-approved.guard';
import { RateLimit } from '../../../../common/guards/rate-limit.guard';
import {
  CreateSellerPaymentAccountDto,
  UpdateSellerPaymentAccountDto,
} from '../dto/seller-payment-account.dto';
import {
  RejectManualPaymentDto,
  ReportManualPaymentDto,
  StartManualPaymentDto,
} from '../dto/manual-payment.dto';
import { ManualPaymentsService } from './manual-payments.service';
import { SellerPaymentAccountsService } from './seller-payment-accounts.service';

/**
 * Pago directo al vendedor: cuentas de cobro propias del vendedor, reporte de
 * referencia del comprador y confirmación del vendedor.
 */
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class ManualPaymentsController {
  constructor(
    private readonly accounts: SellerPaymentAccountsService,
    private readonly manual: ManualPaymentsService
  ) {}

  @Get('banks')
  banks() {
    return this.accounts.listBanks();
  }

  // ─── Cuentas de cobro del vendedor ────────────────────────────────────────

  @Get('seller-accounts')
  myAccounts(@CurrentUser() user: { id: string }) {
    return this.accounts.listMine(user.id);
  }

  // KYC aprobado: el titular que recibe pagos de terceros tiene que estar
  // identificado.
  @Post('seller-accounts')
  @UseGuards(KycApprovedGuard)
  createAccount(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSellerPaymentAccountDto
  ) {
    return this.accounts.create(user.id, dto);
  }

  @Patch('seller-accounts/:id')
  @UseGuards(KycApprovedGuard)
  updateAccount(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSellerPaymentAccountDto
  ) {
    return this.accounts.setActive(user.id, id, dto.isActive ?? true);
  }

  @Delete('seller-accounts/:id')
  removeAccount(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.accounts.remove(user.id, id);
  }

  // ─── Comprador ────────────────────────────────────────────────────────────

  @Post('manual/intents')
  start(
    @CurrentUser() user: { id: string },
    @Body() dto: StartManualPaymentDto
  ) {
    return this.manual.start(user.id, dto.sourceType, dto.sourceId);
  }

  @Post('manual/intents/:id/report')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 10,
    keyGenerator: (req) => `payments:manual-report:${(req as any).user?.id}`,
  })
  report(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportManualPaymentDto
  ) {
    return this.manual.report(user.id, id, dto);
  }

  @Post('manual/intents/:id/cancel')
  cancel(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.manual.cancel(user.id, id);
  }

  // ─── Vendedor ─────────────────────────────────────────────────────────────

  @Get('manual/reports/incoming')
  incoming(
    @CurrentUser() user: { id: string },
    @Query('status') status?: ManualPaymentReportStatus
  ) {
    const valid = Object.values(ManualPaymentReportStatus).includes(
      status as ManualPaymentReportStatus
    );
    return this.manual.listIncoming(user.id, valid ? status : undefined);
  }

  @Post('manual/reports/:id/confirm')
  confirm(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.manual.confirm(user.id, id);
  }

  @Post('manual/reports/:id/reject')
  reject(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectManualPaymentDto
  ) {
    return this.manual.reject(user.id, id, dto.reason);
  }
}
