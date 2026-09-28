import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { QueryPurchasesDto } from './dto/query-purchases.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, CapabilityGuard)
@RequireCapability('HAS_COMMERCE')
@Controller('purchases')
export class PurchasesController {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly commerceResolver: CommerceResolverService,
  ) {}

  @Get()
  @RequirePermission('purchases:view')
  async findAll(@CurrentUser() user: any, @Query() query: QueryPurchasesDto) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.purchasesService.findAll(commerceId, query);
  }

  @Get('replacement-cost/:productId')
  @RequirePermission('purchases:view')
  async getReplacementCost(
    @Param('productId') productId: string,
    @CurrentUser() user: any,
  ) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.purchasesService.getReplacementCost(productId, commerceId);
  }

  // Reporte de Costos: todos los productos con compras registradas,
  // ordenados por mayor caída de margen histórico vs. reposición — la vista
  // agregada que faltaba junto a getReplacementCost (por producto individual).
  @Get('margin-report')
  @RequirePermission('purchases:view')
  async getMarginReport(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.purchasesService.getMarginReport(
      commerceId,
      Math.max(1, parseInt(page ?? '1')),
      Math.min(50, Math.max(1, parseInt(limit ?? '20'))),
    );
  }

  @Post()
  @RequirePermission('purchases:create')
  async create(@CurrentUser() user: any, @Body() dto: CreatePurchaseDto) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.purchasesService.create(commerceId, user.id, dto);
  }

  @Delete(':id')
  @RequirePermission('purchases:delete')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.purchasesService.remove(id, commerceId);
  }
}
