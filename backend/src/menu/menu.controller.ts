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
import { MenuService } from './menu.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { UpdateStockDto } from './dto/update-stock.dto'

@Controller('menu')
@UseGuards(JwtAuthGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ─── Categories ─────────────────────────────────────────────────────────────

  @Get('categories')
  getCategories(@CurrentUser() user: { id: string }) {
    return this.menuService.getCategories(user.id)
  }

  @Post('categories')
  createCategory(@CurrentUser() user: { id: string }, @Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(user.id, dto)
  }

  @Put('categories/:id')
  updateCategory(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.menuService.updateCategory(user.id, id, dto)
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategory(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.menuService.deleteCategory(user.id, id)
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  @Get('products')
  getProducts(@CurrentUser() user: { id: string }) {
    return this.menuService.getProducts(user.id)
  }

  @Get('categories/:id/products')
  getProductsByCategory(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.menuService.getProductsByCategory(user.id, id)
  }

  @Post('products')
  createProduct(@CurrentUser() user: { id: string }, @Body() dto: CreateProductDto) {
    return this.menuService.createProduct(user.id, dto)
  }

  @Put('products/:id')
  updateProduct(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.menuService.updateProduct(user.id, id, dto)
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProduct(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.menuService.deleteProduct(user.id, id)
  }

  @Patch('products/:id/stock')
  updateStock(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.menuService.updateStock(user.id, id, dto)
  }

  @Patch('products/:id/toggle-status')
  toggleProductStatus(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.menuService.toggleProductStatus(user.id, id)
  }
}
