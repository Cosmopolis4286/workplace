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
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { UpdateStockDto } from './dto/update-stock.dto'

@Controller('menu')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ─── Categories ─────────────────────────────────────────────────────────────

  @Get('categories')
  @RequirePermission('menu:view')
  getCategories(@CurrentUser() user: { id: string }) {
    return this.menuService.getCategories(user.id)
  }

  @Post('categories')
  @RequirePermission('menu:create')
  createCategory(@CurrentUser() user: { id: string }, @Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(user.id, dto)
  }

  @Put('categories/:id')
  @RequirePermission('menu:edit')
  updateCategory(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.menuService.updateCategory(user.id, id, dto)
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('menu:delete')
  deleteCategory(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.menuService.deleteCategory(user.id, id)
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  @Get('products')
  @RequirePermission('menu:view')
  getProducts(@CurrentUser() user: { id: string }) {
    return this.menuService.getProducts(user.id)
  }

  @Get('categories/:id/products')
  @RequirePermission('menu:view')
  getProductsByCategory(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.menuService.getProductsByCategory(user.id, id)
  }

  @Post('products')
  @RequirePermission('menu:create')
  createProduct(@CurrentUser() user: { id: string }, @Body() dto: CreateProductDto) {
    return this.menuService.createProduct(user.id, dto)
  }

  @Put('products/:id')
  @RequirePermission('menu:edit')
  updateProduct(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.menuService.updateProduct(user.id, id, dto)
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('menu:delete')
  deleteProduct(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.menuService.deleteProduct(user.id, id)
  }

  @Patch('products/:id/stock')
  @RequirePermission('inventory:edit')
  updateStock(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.menuService.updateStock(user.id, id, dto)
  }

  @Patch('products/:id/toggle-status')
  @RequirePermission('menu:edit')
  toggleProductStatus(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.menuService.toggleProductStatus(user.id, id)
  }
}
