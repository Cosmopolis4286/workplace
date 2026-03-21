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
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CatalogOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

  @Get('restaurants')
  @UseGuards(OptionalJwtAuthGuard)
  getRestaurants() {
    return this.catalogService.getRestaurants();
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
  @UseGuards(OptionalJwtAuthGuard)
  createOrder(@Body() dto: CreateCatalogOrderDto, @CurrentUser() user: any) {
    return this.catalogService.createOrder(dto, user?.id);
  }

  @Get('orders/mine')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!restaurant)
      return { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
    return this.catalogService.getOrdersForRestaurant(restaurant.id, {
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
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return this.catalogService.updateOrderStatus(
      id,
      restaurant?.id ?? '',
      status
    );
  }
}
