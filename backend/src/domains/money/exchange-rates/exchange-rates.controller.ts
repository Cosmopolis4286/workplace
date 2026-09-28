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
import { Throttle } from '@nestjs/throttler';
import { ExchangeRatesService } from './exchange-rates.service';
import { BcvSyncService } from './bcv-sync.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly bcvSyncService: BcvSyncService,
  ) {}

  // ─── Truly public — no auth required ─────────────────────────────────────
  // Límite explícito (más alto que el default global de 20/60s, ver
  // SpanishThrottlerGuard en app.module.ts) — son lecturas cacheable-friendly
  // que el frontend público puede disparar varias veces por carga de página
  // (tabla + sidebar de conversión), pero siguen necesitando un techo: cada
  // hit con autoSync dispara ensureFreshRate() en background, y sin límite
  // un loop externo podría generar presión innecesaria de requests salientes
  // hacia el BCV/API fallback, aunque el dedup interno por moneda ya evita
  // sincronizaciones duplicadas simultáneas.

  @Get('public')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  findAllPublic() {
    return this.exchangeRatesService.findAll(false);
  }

  @Get('active')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  findActive() {
    return this.exchangeRatesService.findAll(false);
  }

  @Get('default')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  findDefault() {
    return this.exchangeRatesService.findDefault();
  }

  @Get('convert')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  convert(@Query('amount') amount: string) {
    const usd = parseFloat(amount) || 1;
    return this.exchangeRatesService.convertAmount(usd);
  }

  // ─── BCV Sync endpoints ───────────────────────────────────────────────────

  @Post('sync/:code')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:manage')
  async syncCurrency(@Param('code') code: string) {
    // Mismo shape { success, message } que syncAll() ya devuelve por moneda
    // — sin este try/catch, si BCV scraping + API fallback fallan ambos, la
    // excepción de bcvSyncService.syncCurrency() subía sin capturar y NestJS
    // la convertía en un 500 genérico sin mensaje útil para el admin. El
    // frontend (handleManualSync/handleManualSyncFromTable) ya esperaba
    // `res.message` en el caso de fallo, pero nunca lo recibía.
    try {
      const result = await this.bcvSyncService.syncCurrency(code.toUpperCase());
      return {
        success: true,
        code: code.toUpperCase(),
        rate: result.rate,
        source: result.source,
        date: result.date,
        confidence: result.confidence,
      };
    } catch (error) {
      return {
        success: false,
        code: code.toUpperCase(),
        message: error.message ?? 'No se pudo sincronizar: todas las fuentes fallaron',
      };
    }
  }

  @Post('sync-all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:manage')
  async syncAll() {
    const statuses = await this.bcvSyncService.getAllSyncStatuses();
    const results = await Promise.allSettled(
      statuses.map(s => this.bcvSyncService.syncCurrency(s.currencyCode)),
    );

    return results.map((result, index) => {
      const code = statuses[index].currencyCode;
      return result.status === 'fulfilled'
        ? { code, success: true, rate: result.value.rate, source: result.value.source }
        : { code, success: false, message: result.reason?.message ?? 'Error desconocido' };
    });
  }

  @Get('sync-status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:view')
  async getAllSyncStatuses() {
    return this.bcvSyncService.getAllSyncStatuses();
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

  @Get(':id/history')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:view')
  getHistory(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.exchangeRatesService.getHistory(id, limit ? parseInt(limit, 10) : undefined);
  }

  // Consultado por el modal de confirmación de eliminar en el frontend —
  // muestra el impacto real (cuántos registros históricos usan esa moneda)
  // antes de que el admin confirme el borrado.
  @Get(':id/usage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('exchange_rates:view')
  getUsageCount(@Param('id') id: string) {
    return this.exchangeRatesService.getUsageCount(id);
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
