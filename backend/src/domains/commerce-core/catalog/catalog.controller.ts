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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CatalogOrderStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly prisma: PrismaService
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
  getStoreBySlug(@Param('slug') slug: string) {
    return this.catalogService.getStoreBySlug(slug);
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
    const commerce = await this.prisma.commerce.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!commerce)
      return { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
    return this.catalogService.getOrdersForCommerce(commerce.id, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: CatalogOrderStatus,
    @CurrentUser() user: any
  ) {
    const commerce = await this.prisma.commerce.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return this.catalogService.updateOrderStatus(
      id,
      commerce?.id ?? '',
      status
    );
  }

  @Patch('orders/:id/confirm-completion')
  @UseGuards(JwtAuthGuard)
  confirmCompletion(@Param('id') id: string, @CurrentUser() user: any) {
    return this.catalogService.confirmOrderCompletion(id, user.id);
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
