import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { QueryCatalogDto } from './dto/query-catalog.dto';
import { CreateCatalogOrderDto } from './dto/create-catalog-order.dto';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { KycApprovedGuard } from '../../../common/guards/kyc-approved.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CatalogOrderStatus } from '@prisma/client';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly commerceResolver: CommerceResolverService
  ) {}

  @Get('categories')
  @UseGuards(OptionalJwtAuthGuard)
  getCategories() {
    return this.catalogService.getCategories();
  }

  @Get('commerces')
  @UseGuards(OptionalJwtAuthGuard)
  getCommerces() {
    return this.catalogService.getCommerces();
  }

  @Get('store/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  getStoreBySlug(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.catalogService.getStoreBySlug(slug, user?.id);
  }

  @Get('tags')
  @UseGuards(OptionalJwtAuthGuard)
  getTags(@Query('q') q?: string) {
    return this.catalogService.getPopularTags(q);
  }

  @Get('products')
  @UseGuards(OptionalJwtAuthGuard)
  getProducts(@Query() dto: QueryCatalogDto) {
    return this.catalogService.getProducts(dto);
  }

  @Get('products/:id')
  @UseGuards(OptionalJwtAuthGuard)
  getProduct(@Param('id') id: string) {
    return this.catalogService.getProduct(id);
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard, KycApprovedGuard)
  createOrder(@Body() dto: CreateCatalogOrderDto, @CurrentUser() user: any) {
    return this.catalogService.createOrder(dto, user.id);
  }

  @Get('orders/mine')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    // Mismo resolvedor que PATCH status: si algún día un comercio admite
    // varias cuentas, listar y atender pedidos cambian a la vez.
    const commerceId = await this.commerceResolver.find(user.id);
    if (!commerceId)
      return { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
    return this.catalogService.getOrdersForCommerce(commerceId, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CapabilityGuard)
  @RequireCapability('HAS_COMMERCE')
  @RequirePermission('catalog:manage_orders')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: CatalogOrderStatus,
    @CurrentUser() user: any
  ) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.catalogService.updateOrderStatus(id, commerceId, status);
  }

  @Patch('orders/:id/confirm-completion')
  @UseGuards(JwtAuthGuard)
  confirmCompletion(@Param('id') id: string, @CurrentUser() user: any) {
    return this.catalogService.confirmOrderCompletion(id, user.id);
  }

  // El comprador cancela mientras el comercio no lo atendió (PENDING/SEEN);
  // si había garantía se le reembolsa.
  @Patch('orders/:id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.catalogService.cancelOrderByBuyer(id, user.id);
  }

  @Patch('orders/:id/dispute')
  @UseGuards(JwtAuthGuard)
  disputeOrder(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('reason') reason: string
  ) {
    return this.catalogService.disputeOrder(id, user.id, reason);
  }

  @Get('orders/sent')
  @UseGuards(JwtAuthGuard)
  getOrdersSent(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.catalogService.getOrdersSentByRequester(user.id, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }
}
