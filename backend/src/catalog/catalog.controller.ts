import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common'
import { CatalogService } from './catalog.service'
import { QueryCatalogDto } from './dto/query-catalog.dto'
import { CreateCatalogOrderDto } from './dto/create-catalog-order.dto'
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  @UseGuards(OptionalJwtAuthGuard)
  getCategories() {
    return this.catalogService.getCategories()
  }

  @Get('restaurants')
  @UseGuards(OptionalJwtAuthGuard)
  getRestaurants() {
    return this.catalogService.getRestaurants()
  }

  @Get('products')
  @UseGuards(OptionalJwtAuthGuard)
  getProducts(@Query() dto: QueryCatalogDto) {
    return this.catalogService.getProducts(dto)
  }

  @Get('products/:id')
  @UseGuards(OptionalJwtAuthGuard)
  getProduct(@Param('id') id: string) {
    return this.catalogService.getProduct(id)
  }

  @Post('orders')
  @UseGuards(OptionalJwtAuthGuard)
  createOrder(@Body() dto: CreateCatalogOrderDto, @CurrentUser() user: any) {
    return this.catalogService.createOrder(dto, user?.id)
  }

  @Get('orders/restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard)
  getOrders(@Param('restaurantId') restaurantId: string) {
    return this.catalogService.getOrdersForRestaurant(restaurantId)
  }
}
