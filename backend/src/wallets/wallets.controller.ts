import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { QueryWalletTransactionsDto } from './dto/query-wallet-transactions.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransferDto } from './dto/transfer.dto';
import { PaymentDto } from './dto/payment.dto';
import { AdjustDto } from './dto/adjust.dto';

@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  // ─── Own wallet ─────────────────────────────────────────────────────────────

  @Post('me')
  createMine(@CurrentUser() user: any, @Body() dto: CreateWalletDto) {
    return this.walletsService.createForCurrentUser(user.id, dto);
  }

  @Get('me')
  getMine(@CurrentUser() user: any) {
    return this.walletsService.getCurrentUserWallet(user.id);
  }

  @Get('me/transactions')
  getMyTransactions(
    @CurrentUser() user: any,
    @Query() query: QueryWalletTransactionsDto,
  ) {
    return this.walletsService.listCurrentUserTransactions(user.id, query);
  }

  // ─── Financial operations (own wallet) ──────────────────────────────────────

  @Post('me/deposit')
  deposit(@CurrentUser() user: any, @Body() dto: DepositDto) {
    return this.walletsService.deposit(user.id, dto);
  }

  @Post('me/withdraw')
  withdraw(@CurrentUser() user: any, @Body() dto: WithdrawDto) {
    return this.walletsService.withdraw(user.id, dto);
  }

  @Post('me/transfer')
  transfer(@CurrentUser() user: any, @Body() dto: TransferDto) {
    return this.walletsService.transfer(user.id, dto);
  }

  @Post('me/payment')
  payment(@CurrentUser() user: any, @Body() dto: PaymentDto) {
    return this.walletsService.payment(user.id, dto);
  }

  // ─── Admin – all wallets ─────────────────────────────────────────────────────

  @Get()
  list(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.walletsService.listWallets(user.role, parseInt(page), parseInt(limit));
  }

  @Post('users/:userId')
  createForUser(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateWalletDto,
  ) {
    return this.walletsService.createForUser(userId, dto, user.role);
  }

  @Get('users/:userId')
  getForUser(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.walletsService.getUserWallet(userId, user.role);
  }

  @Get('users/:userId/transactions')
  getUserTransactions(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Query() query: QueryWalletTransactionsDto,
  ) {
    return this.walletsService.listUserTransactions(userId, user.role, query);
  }

  @Post('users/:userId/adjust')
  adjustBalance(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Body() dto: AdjustDto,
  ) {
    return this.walletsService.adjust(userId, user.role, dto);
  }
}
