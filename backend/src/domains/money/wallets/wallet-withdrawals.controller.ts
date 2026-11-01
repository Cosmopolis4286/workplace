import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { WalletWithdrawalsService } from './wallet-withdrawals.service';
import {
  MarkWithdrawalPaidDto,
  RejectWithdrawalDto,
} from './dto/review-withdrawal.dto';

// La creación vive en POST /wallets/me/withdraw (PIN, límites y débito
// atómico); aquí se consultan y se cierran las solicitudes.
@Controller('wallet-withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class WalletWithdrawalsController {
  constructor(private readonly service: WalletWithdrawalsService) {}

  @Get('mine')
  @RequirePermission('wallets:use')
  listMine(@CurrentUser() user: any) {
    return this.service.listMine(user.id);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  listAll(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20'
  ) {
    return this.service.listAll(
      status,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20
    );
  }

  @Patch(':id/paid')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: MarkWithdrawalPaidDto
  ) {
    return this.service.markPaid(id, user.id, dto.payoutReference);
  }

  @Patch(':id/reject')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: RejectWithdrawalDto
  ) {
    return this.service.reject(id, user.id, dto.reason);
  }
}
