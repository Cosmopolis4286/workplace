import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { InventoryService } from './inventory.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { UpdateStockDto } from './dto/update-stock.dto'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // ─── Categories ───────────────────────────────────────────────────────────

  @Get('categories')
  getCategories(@CurrentUser() user: any) {
    return this.inventoryService.getCategories(user.restaurant.id)
  }

  @Post('categories')
  createCategory(@CurrentUser() user: any, @Body() dto: CreateCategoryDto) {
    return this.inventoryService.createCategory(user.restaurant.id, dto)
  }

  @Put('categories/:id')
  updateCategory(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.inventoryService.updateCategory(user.restaurant.id, id, dto)
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  deleteCategory(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.deleteCategory(user.restaurant.id, id)
  }

  // ─── Products ─────────────────────────────────────────────────────────────

  @Get('products')
  getProducts(@CurrentUser() user: any) {
    return this.inventoryService.getProducts(user.restaurant.id)
  }

  @Get('products/:id')
  getProduct(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.getProduct(user.restaurant.id, id)
  }

  @Post('products')
  createProduct(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(user.restaurant.id, dto)
  }

  @Put('products/:id')
  updateProduct(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.inventoryService.updateProduct(user.restaurant.id, id, dto)
  }

  @Patch('products/:id/stock')
  updateStock(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.inventoryService.updateStock(user.restaurant.id, id, dto)
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.OK)
  deleteProduct(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.deleteProduct(user.restaurant.id, id)
  }
}
