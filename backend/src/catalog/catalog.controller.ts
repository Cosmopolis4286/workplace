import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CatalogService } from './catalog.service'
import { QueryCatalogDto } from './dto/query-catalog.dto'

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  getCategories() {
    return this.catalogService.getCategories()
  }

  @Get('restaurants')
  getRestaurants() {
    return this.catalogService.getRestaurants()
  }

  @Get('products')
  getProducts(@Query() dto: QueryCatalogDto) {
    return this.catalogService.getProducts(dto)
  }
}
