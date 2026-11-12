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
import { Role, WithdrawalStatus } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { EmailVerifiedGuard } from '../../../common/guards/email-verified.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { WalletEnabledGuard } from '../../../common/guards/wallet-enabled.guard';
import { KycApprovedGuard } from '../../../common/guards/kyc-approved.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import {
  RateLimit,
  RateLimitGuard,
} from '../../../common/guards/rate-limit.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import {
  CreateWithdrawalDto,
  MarkWithdrawalPaidDto,
  RejectWithdrawalDto,
} from './dto/wallet-withdrawal.dto';
import { WalletWithdrawalsService } from './wallet-withdrawals.service';

/** Solicitudes de retiro del saldo de la billetera a una cuenta bancaria. */
@Controller('wallet-withdrawals')
@UseGuards(
  WalletEnabledGuard,
  JwtAuthGuard,
  PermissionsGuard,
  RolesGuard,
  RateLimitGuard
)
export class WalletWithdrawalsController {
  constructor(private readonly withdrawals: WalletWithdrawalsService) {}

  @Get('mine')
  @RequirePermission('wallets:use')
  mine(@CurrentUser() user: { id: string }) {
    return this.withdrawals.listMine(user.id);
  }

  @Post()
  @RequirePermission('wallets:use')
  @UseGuards(EmailVerifiedGuard, KycApprovedGuard)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 5,
    keyGenerator: (req) => `wallet:withdrawal:${(req as any).user?.id}`,
  })
  create(
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: CreateWithdrawalDto
  ) {
    return this.withdrawals.create(user.id, user.role, dto);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Get('admin')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  list(@Query('status') status?: string) {
    const valid = Object.values(WithdrawalStatus).includes(
      status as WithdrawalStatus
    );
    return this.withdrawals.list(
      valid ? (status as WithdrawalStatus) : undefined
    );
  }

  // Pagar o devolver dinero real: solo SUPERADMIN.
  @Post('admin/:id/paid')
  @Roles(Role.SUPERADMIN)
  markPaid(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkWithdrawalPaidDto
  ) {
    return this.withdrawals.markPaid(user.id, id, dto.payoutReference);
  }

  @Post('admin/:id/reject')
  @Roles(Role.SUPERADMIN)
  reject(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectWithdrawalDto
  ) {
    return this.withdrawals.reject(user.id, id, dto.reason);
  }
}
