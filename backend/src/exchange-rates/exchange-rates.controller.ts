import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { BcvSyncService } from './bcv-sync.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('exchange-rates')
@UseGuards(JwtAuthGuard)
export class ExchangeRatesController {
  constructor(
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly bcvSyncService: BcvSyncService,
  ) {}

  // ─── Public (authenticated) — needed by product/service price display ──────

  @Get('public')
  findAllPublic() {
    return this.exchangeRatesService.findAll(false);
  }

  // Returns active currencies for UI selects (all authenticated users)
  @Get('active')
  findActive() {
    return this.exchangeRatesService.findAll(false);
  }

  @Get('default')
  findDefault() {
    return this.exchangeRatesService.findDefault();
  }

  @Get('convert')
  convert(@Query('amount') amount: string) {
    const usd = parseFloat(amount) || 1;
    return this.exchangeRatesService.convertAmount(usd);
  }

  // ─── BCV Sync endpoints ───────────────────────────────────────────────────

  @Post('sync/:code')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  async syncCurrency(@Param('code') code: string) {
    const result = await this.bcvSyncService.syncCurrency(code.toUpperCase());
    return {
      success: true,
      code: code.toUpperCase(),
      rate: result.rate,
      source: result.source,
      date: result.date,
      confidence: result.confidence,
    };
  }

  @Get('sync-status/:code')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async getSyncStatus(@Param('code') code: string) {
    const status = await this.bcvSyncService.getSyncStatus(code.toUpperCase());
    if (!status) {
      return { error: `Currency ${code} not found` };
    }
    return status;
  }

  @Patch(':code/auto-sync')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  async setAutoSync(
    @Param('code') code: string,
    @Body('enabled') enabled: boolean,
  ) {
    await this.bcvSyncService.setAutoSync(code.toUpperCase(), enabled);
    return {
      success: true,
      code: code.toUpperCase(),
      autoSync: enabled,
    };
  }

  @Get('current-rate/:code')
  async getCurrentRate(@Param('code') code: string) {
    const rate = await this.bcvSyncService.getCurrentRate(code.toUpperCase());
    if (!rate) {
      return { error: `Could not get current rate for ${code}` };
    }
    return rate;
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getStats() {
    return this.exchangeRatesService.getStats();
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.exchangeRatesService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.exchangeRatesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  create(@Body() dto: CreateExchangeRateDto, @CurrentUser() user: any) {
    return this.exchangeRatesService.create(dto, user.id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExchangeRateDto,
    @CurrentUser() user: any
  ) {
    return this.exchangeRatesService.update(id, dto, user.id);
  }

  @Patch(':id/set-default')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  setDefault(@Param('id') id: string, @CurrentUser() user: any) {
    return this.exchangeRatesService.setDefault(id, user.id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  toggleStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.exchangeRatesService.toggleStatus(id, user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  remove(@Param('id') id: string) {
    return this.exchangeRatesService.remove(id);
  }
}
