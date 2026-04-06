import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { CategoriesGlobalService } from './categories-global.service'
import { CreateCategoryDto, UpdateCategoryDto } from '../menu/dto/category.dto'
import { CreateSubcategoryDto, UpdateSubcategoryDto } from '../menu/dto/subcategory.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../permissions/guards/permissions.guard'
import { RequirePermissions } from '../permissions/decorators/permissions.decorator'

@ApiTags('Categorías Globales')
@Controller('categories-global')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CategoriesGlobalController {
  constructor(private readonly categoriesGlobalService: CategoriesGlobalService) {}

  // ==================== CATEGORÍAS GLOBALES ====================

  @Get()
  @ApiOperation({ summary: 'Obtener todas las categorías globales' })
  @ApiResponse({ status: 200, description: 'Categorías globales encontradas' })
  @RequirePermissions('categories_global:view')
  async findAllCategories() {
    return this.categoriesGlobalService.findAllCategories()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener categoría global por ID' })
  @ApiResponse({ status: 200, description: 'Categoría global encontrada' })
  @ApiResponse({ status: 404, description: 'Categoría global no encontrada' })
  @RequirePermissions('categories_global:view')
  async findCategoryById(@Param('id') id: string) {
    return this.categoriesGlobalService.findCategoryById(id)
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva categoría global' })
  @ApiResponse({ status: 201, description: 'Categoría global creada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Categoría global ya existe' })
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('categories_global:create')
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesGlobalService.createCategory(createCategoryDto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar categoría global' })
  @ApiResponse({ status: 200, description: 'Categoría global actualizada' })
  @ApiResponse({ status: 404, description: 'Categoría global no encontrada' })
  @RequirePermissions('categories_global:edit')
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesGlobalService.updateCategory(id, updateCategoryDto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar categoría global' })
  @ApiResponse({ status: 200, description: 'Categoría global eliminada' })
  @ApiResponse({ status: 404, description: 'Categoría global no encontrada' })
  @RequirePermissions('categories_global:delete')
  async deleteCategory(@Param('id') id: string) {
    return this.categoriesGlobalService.deleteCategory(id)
  }

  // ==================== SUBCATEGORÍAS GLOBALES ====================

  @Get(':categoryId/subcategories')
  @ApiOperation({ summary: 'Obtener subcategorías de una categoría global' })
  @ApiResponse({ status: 200, description: 'Subcategorías encontradas' })
  @RequirePermissions('subcategories_global:view')
  async findSubcategoriesByCategory(@Param('categoryId') categoryId: string) {
    return this.categoriesGlobalService.findSubcategoriesByCategory(categoryId)
  }

  @Get('subcategories/:id')
  @ApiOperation({ summary: 'Obtener subcategoría global por ID' })
  @ApiResponse({ status: 200, description: 'Subcategoría global encontrada' })
  @ApiResponse({ status: 404, description: 'Subcategoría global no encontrada' })
  @RequirePermissions('subcategories_global:view')
  async findSubcategoryById(@Param('id') id: string) {
    return this.categoriesGlobalService.findSubcategoryById(id)
  }

  @Post(':categoryId/subcategories')
  @ApiOperation({ summary: 'Crear nueva subcategoría global' })
  @ApiResponse({ status: 201, description: 'Subcategoría global creada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Subcategoría global ya existe' })
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('subcategories_global:create')
  async createSubcategory(
    @Param('categoryId') categoryId: string,
    @Body() createSubcategoryDto: CreateSubcategoryDto,
  ) {
    return this.categoriesGlobalService.createSubcategory(categoryId, createSubcategoryDto)
  }

  @Put('subcategories/:id')
  @ApiOperation({ summary: 'Actualizar subcategoría global' })
  @ApiResponse({ status: 200, description: 'Subcategoría global actualizada' })
  @ApiResponse({ status: 404, description: 'Subcategoría global no encontrada' })
  @RequirePermissions('subcategories_global:edit')
  async updateSubcategory(
    @Param('id') id: string,
    @Body() updateSubcategoryDto: UpdateSubcategoryDto,
  ) {
    return this.categoriesGlobalService.updateSubcategory(id, updateSubcategoryDto)
  }

  @Delete('subcategories/:id')
  @ApiOperation({ summary: 'Eliminar subcategoría global' })
  @ApiResponse({ status: 200, description: 'Subcategoría global eliminada' })
  @ApiResponse({ status: 404, description: 'Subcategoría global no encontrada' })
  @RequirePermissions('subcategories_global:delete')
  async deleteSubcategory(@Param('id') id: string) {
    return this.categoriesGlobalService.deleteSubcategory(id)
  }

  // ==================== UTILIDADES ====================

  @Get('export/csv')
  @ApiOperation({ summary: 'Exportar categorías globales a CSV' })
  @ApiResponse({ status: 200, description: 'Archivo CSV generado' })
  @RequirePermissions('categories_global:view')
  async exportCategoriesToCsv() {
    return this.categoriesGlobalService.exportCategoriesToCsv()
  }

  @Post('import/csv')
  @ApiOperation({ summary: 'Importar categorías globales desde CSV' })
  @ApiResponse({ status: 201, description: 'Categorías importadas' })
  @ApiResponse({ status: 400, description: 'Formato de archivo inválido' })
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('categories_global:create')
  async importCategoriesFromCsv(@Body() data: { categories: any[] }) {
    return this.categoriesGlobalService.importCategoriesFromCsv(data.categories)
  }
}
