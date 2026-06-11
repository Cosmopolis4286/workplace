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
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly bcvSyncService: BcvSyncService,
  ) {}

  // ─── Truly public — no auth required ─────────────────────────────────────

  @Get('public')
  findAllPublic() {
    return this.exchangeRatesService.findAll(false);
  }

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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:manage')
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:view')
  async getSyncStatus(@Param('code') code: string) {
    const status = await this.bcvSyncService.getSyncStatus(code.toUpperCase());
    if (!status) {
      return { error: `Currency ${code} not found` };
    }
    return status;
  }

  @Patch(':code/auto-sync')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:manage')
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:view')
  async getCurrentRate(@Param('code') code: string) {
    const rate = await this.bcvSyncService.getCurrentRate(code.toUpperCase());
    if (!rate) {
      return { error: `Could not get current rate for ${code}` };
    }
    return rate;
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:view')
  getStats() {
    return this.exchangeRatesService.getStats();
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:view')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.exchangeRatesService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:view')
  findOne(@Param('id') id: string) {
    return this.exchangeRatesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:manage')
  create(@Body() dto: CreateExchangeRateDto, @CurrentUser() user: any) {
    return this.exchangeRatesService.create(dto, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:manage')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExchangeRateDto,
    @CurrentUser() user: any
  ) {
    return this.exchangeRatesService.update(id, dto, user.id);
  }

  @Patch(':id/set-default')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:manage')
  setDefault(@Param('id') id: string, @CurrentUser() user: any) {
    return this.exchangeRatesService.setDefault(id, user.id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:manage')
  toggleStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.exchangeRatesService.toggleStatus(id, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:manage')
  remove(@Param('id') id: string) {
    return this.exchangeRatesService.remove(id);
  }
}
