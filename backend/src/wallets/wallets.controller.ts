import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { EmailVerifiedGuard } from '../common/guards/email-verified.guard';
import { KycApprovedGuard } from '../common/guards/kyc-approved.guard';
import { RateLimitGuard, RateLimit } from '../common/guards/rate-limit.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { QueryWalletTransactionsDto } from './dto/query-wallet-transactions.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransferDto } from './dto/transfer.dto';
import { PaymentDto } from './dto/payment.dto';
import { AdjustDto } from './dto/adjust.dto';
import { SetPinDto, ChangePinDto } from './dto/set-pin.dto';

@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  // ─── Own wallet ──────────────────────────────────────────────────────────────

  @Post('me')
  @RateLimit({ windowMs: 60_000, maxRequests: 5, keyGenerator: (req) => `wallet:create:${(req as any).user?.id}` })
  createMine(@CurrentUser() user: any, @Body() dto: CreateWalletDto) {
    return this.walletsService.createForCurrentUser(user.id, dto);
  }

  @Get('me')
  @RateLimit({ windowMs: 60_000, maxRequests: 60, keyGenerator: (req) => `wallet:get:${(req as any).user?.id}` })
  getMine(@CurrentUser() user: any) {
    return this.walletsService.getCurrentUserWallet(user.id);
  }

  @Get('me/transactions')
  @RateLimit({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req) => `wallet:txlist:${(req as any).user?.id}` })
  getMyTransactions(@CurrentUser() user: any, @Query() query: QueryWalletTransactionsDto) {
    return this.walletsService.listCurrentUserTransactions(user.id, query);
  }

  @Get('me/limits')
  getMyLimits(@CurrentUser() user: any) {
    return this.walletsService.getMyLimits(user.id, user.role);
  }

  // ─── PIN management ──────────────────────────────────────────────────────────

  @Post('me/pin')
  @UseGuards(EmailVerifiedGuard)
  @RateLimit({ windowMs: 60_000, maxRequests: 5, keyGenerator: (req) => `wallet:pin:set:${(req as any).user?.id}` })
  setPin(@CurrentUser() user: any, @Body() dto: SetPinDto) {
    return this.walletsService.setPin(user.id, dto);
  }

  @Patch('me/pin')
  @UseGuards(EmailVerifiedGuard)
  @RateLimit({ windowMs: 60_000, maxRequests: 5, keyGenerator: (req) => `wallet:pin:change:${(req as any).user?.id}` })
  changePin(@CurrentUser() user: any, @Body() dto: ChangePinDto) {
    return this.walletsService.changePin(user.id, dto);
  }

  @Delete('me/pin')
  @UseGuards(EmailVerifiedGuard)
  @RateLimit({ windowMs: 60_000, maxRequests: 3, keyGenerator: (req) => `wallet:pin:del:${(req as any).user?.id}` })
  removePin(@CurrentUser() user: any, @Body() dto: SetPinDto) {
    return this.walletsService.removePin(user.id, dto);
  }

  // ─── Financial operations ─────────────────────────────────────────────────────

  @Post('me/deposit')
  @UseGuards(EmailVerifiedGuard)
  @RateLimit({ windowMs: 60_000, maxRequests: 10, keyGenerator: (req) => `wallet:deposit:${(req as any).user?.id}` })
  deposit(@CurrentUser() user: any, @Body() dto: DepositDto) {
    return this.walletsService.deposit(user.id, user.role, dto);
  }

  @Post('me/withdraw')
  @UseGuards(EmailVerifiedGuard, KycApprovedGuard)
  @RateLimit({ windowMs: 60_000, maxRequests: 5, keyGenerator: (req) => `wallet:withdraw:${(req as any).user?.id}` })
  withdraw(@CurrentUser() user: any, @Body() dto: WithdrawDto) {
    return this.walletsService.withdraw(user.id, user.role, dto);
  }

  @Post('me/transfer')
  @UseGuards(EmailVerifiedGuard, KycApprovedGuard)
  @RateLimit({ windowMs: 60_000, maxRequests: 5, keyGenerator: (req) => `wallet:transfer:${(req as any).user?.id}` })
  transfer(@CurrentUser() user: any, @Body() dto: TransferDto) {
    return this.walletsService.transfer(user.id, user.role, dto);
  }

  @Post('me/payment')
  @UseGuards(EmailVerifiedGuard, KycApprovedGuard)
  @RateLimit({ windowMs: 60_000, maxRequests: 10, keyGenerator: (req) => `wallet:payment:${(req as any).user?.id}` })
  payment(@CurrentUser() user: any, @Body() dto: PaymentDto) {
    return this.walletsService.payment(user.id, user.role, dto);
  }

  // ─── Admin – all wallets ──────────────────────────────────────────────────────

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req) => `wallet:admin:list:${(req as any).user?.id}` })
  list(@CurrentUser() user: any, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.walletsService.listWallets(user.role, parseInt(page), parseInt(limit));
  }

  @Post('users/:userId')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({ windowMs: 60_000, maxRequests: 10, keyGenerator: (req) => `wallet:admin:create:${(req as any).user?.id}` })
  createForUser(@Param('userId') userId: string, @CurrentUser() user: any, @Body() dto: CreateWalletDto) {
    return this.walletsService.createForUser(userId, dto, user.role);
  }

  @Get('users/:userId')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getForUser(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.walletsService.getUserWallet(userId, user.role);
  }

  @Get('users/:userId/transactions')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getUserTransactions(@Param('userId') userId: string, @CurrentUser() user: any, @Query() query: QueryWalletTransactionsDto) {
    return this.walletsService.listUserTransactions(userId, user.role, query);
  }

  @Post('users/:userId/adjust')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({ windowMs: 60_000, maxRequests: 10, keyGenerator: (req) => `wallet:admin:adjust:${(req as any).user?.id}` })
  adjustBalance(@Param('userId') userId: string, @CurrentUser() user: any, @Body() dto: AdjustDto) {
    return this.walletsService.adjust(userId, user.id, user.role, dto);
  }

  @Post('users/:userId/freeze')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({ windowMs: 60_000, maxRequests: 5, keyGenerator: (req) => `wallet:admin:freeze:${(req as any).user?.id}` })
  freeze(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.walletsService.freezeWallet(userId, user.id, user.role);
  }

  @Post('users/:userId/unfreeze')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({ windowMs: 60_000, maxRequests: 5, keyGenerator: (req) => `wallet:admin:unfreeze:${(req as any).user?.id}` })
  unfreeze(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.walletsService.unfreezeWallet(userId, user.role);
  }
}
