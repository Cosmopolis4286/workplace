import {
  Body,
  Controller,
  Delete,
  Get,
  GoneException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { EmailVerifiedGuard } from '../../../common/guards/email-verified.guard';
import {
  RateLimitGuard,
  RateLimit,
} from '../../../common/guards/rate-limit.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { QueryWalletTransactionsDto } from './dto/query-wallet-transactions.dto';
import { AdjustDto } from './dto/adjust.dto';
import { SetPinDto, ChangePinDto } from './dto/set-pin.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard, RateLimitGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  // ─── Own wallet ──────────────────────────────────────────────────────────────

  @Post('me')
  @RequirePermission('wallets:use')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 5,
    keyGenerator: (req) => `wallet:create:${(req as any).user?.id}`,
  })
  createMine(@CurrentUser() user: any, @Body() dto: CreateWalletDto) {
    return this.walletsService.createForCurrentUser(user.id, dto);
  }

  @Get('me')
  @RequirePermission('wallets:use')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 60,
    keyGenerator: (req) => `wallet:get:${(req as any).user?.id}`,
  })
  getMine(@CurrentUser() user: any) {
    return this.walletsService.getCurrentUserWallet(user.id);
  }

  @Get('me/transactions')
  @RequirePermission('wallets:use')
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 30,
    keyGenerator: (req) => `wallet:txlist:${(req as any).user?.id}`,
  })
  getMyTransactions(
    @CurrentUser() user: any,
    @Query() query: QueryWalletTransactionsDto
  ) {
    return this.walletsService.listCurrentUserTransactions(user.id, query);
  }

  @Get('me/limits')
  @RequirePermission('wallets:use')
  getMyLimits(@CurrentUser() user: any) {
    return this.walletsService.getMyLimits(user.id, user.role);
  }

  // ─── PIN management ──────────────────────────────────────────────────────────

  @Post('me/pin')
  @RequirePermission('wallets:use')
  @UseGuards(EmailVerifiedGuard)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 5,
    keyGenerator: (req) => `wallet:pin:set:${(req as any).user?.id}`,
  })
  setPin(@CurrentUser() user: any, @Body() dto: SetPinDto) {
    return this.walletsService.setPin(user.id, dto);
  }

  @Patch('me/pin')
  @RequirePermission('wallets:use')
  @UseGuards(EmailVerifiedGuard)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 5,
    keyGenerator: (req) => `wallet:pin:change:${(req as any).user?.id}`,
  })
  changePin(@CurrentUser() user: any, @Body() dto: ChangePinDto) {
    return this.walletsService.changePin(user.id, dto);
  }

  @Delete('me/pin')
  @RequirePermission('wallets:use')
  @UseGuards(EmailVerifiedGuard)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 3,
    keyGenerator: (req) => `wallet:pin:del:${(req as any).user?.id}`,
  })
  removePin(@CurrentUser() user: any, @Body() dto: SetPinDto) {
    return this.walletsService.removePin(user.id, dto);
  }

  // ─── Financial operations ─────────────────────────────────────────────────────

  // No hay endpoint público de depósito directo: acreditar saldo sin
  // verificar que el dinero exista realmente es el hueco financiero que
  // motivó este módulo. La única vía de carga de saldo es
  // WalletDepositRequestsController (comprobante + aprobación admin), que
  // internamente llama a WalletsService.deposit() ya aprobado.

  // La billetera ya no mueve dinero entre usuarios (ver
  // money/wallet-withdrawals y money/escrow-funding): retirar es una
  // solicitud que un admin paga a una cuenta bancaria, y las transferencias
  // y pagos con saldo se reemplazaron por pagos directos al vendedor.

  @Post('me/withdraw')
  @RequirePermission('wallets:use')
  withdraw() {
    throw new GoneException(
      'Los retiros ahora se solicitan desde "Retirar a mi banco" en tu billetera'
    );
  }

  @Post('me/transfer')
  @RequirePermission('wallets:use')
  transfer() {
    throw new GoneException(
      'Las transferencias entre billeteras ya no están disponibles'
    );
  }

  @Post('me/payment')
  @RequirePermission('wallets:use')
  payment() {
    throw new GoneException(
      'Los pagos con saldo ya no están disponibles: paga directo al vendedor'
    );
  }

  // ─── Admin – all wallets ──────────────────────────────────────────────────────

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 30,
    keyGenerator: (req) => `wallet:admin:list:${(req as any).user?.id}`,
  })
  list(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20'
  ) {
    return this.walletsService.listWallets(
      user.role,
      parseInt(page),
      parseInt(limit)
    );
  }

  // Saldo real de la wallet de plataforma vs. lo que debería haber retenido
  // según las ServiceRequest con escrowStatus=HELD — ver getEscrowReconciliation.
  @Get('escrow-reconciliation')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getEscrowReconciliation(@CurrentUser() user: any) {
    return this.walletsService.getEscrowReconciliation(user.role);
  }

  @Post('users/:userId')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 10,
    keyGenerator: (req) => `wallet:admin:create:${(req as any).user?.id}`,
  })
  createForUser(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateWalletDto
  ) {
    return this.walletsService.createForUser(userId, dto, user.role);
  }

  @Get('users/:userId')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getForUser(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.walletsService.getUserWallet(userId, user.role);
  }

  @Get('users/:userId/transactions')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getUserTransactions(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Query() query: QueryWalletTransactionsDto
  ) {
    return this.walletsService.listUserTransactions(userId, user.role, query);
  }

  @Post('users/:userId/adjust')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 10,
    keyGenerator: (req) => `wallet:admin:adjust:${(req as any).user?.id}`,
  })
  adjustBalance(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Body() dto: AdjustDto
  ) {
    return this.walletsService.adjust(userId, user.id, user.role, dto);
  }

  @Post('users/:userId/freeze')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 5,
    keyGenerator: (req) => `wallet:admin:freeze:${(req as any).user?.id}`,
  })
  freeze(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.walletsService.freezeWallet(userId, user.id, user.role);
  }

  @Post('users/:userId/unfreeze')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  @RateLimit({
    windowMs: 60_000,
    maxRequests: 5,
    keyGenerator: (req) => `wallet:admin:unfreeze:${(req as any).user?.id}`,
  })
  unfreeze(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.walletsService.unfreezeWallet(userId, user.role);
  }
}
