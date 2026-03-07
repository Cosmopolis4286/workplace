import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import { ServicesService } from './services.service'
import { CreateServiceDto } from './dto/create-service.dto'
import { UpdateServiceDto } from './dto/update-service.dto'
import { QueryServicesDto } from './dto/query-services.dto'
import { CreateServiceCategoryDto } from './dto/create-service-category.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard'

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // ─── Catalog (public) ─────────────────────────────────────────────────────

  @Get('catalog/categories')
  @UseGuards(OptionalJwtAuthGuard)
  getCatalogCategories() {
    return this.servicesService.getCatalogCategories()
  }

  @Get('catalog/providers')
  @UseGuards(OptionalJwtAuthGuard)
  getCatalogProviders() {
    return this.servicesService.getCatalogProviders()
  }

  @Get('catalog')
  @UseGuards(OptionalJwtAuthGuard)
  getCatalog(@Query() dto: QueryServicesDto) {
    return this.servicesService.getCatalogServices(dto)
  }

  @Get('catalog/:id')
  @UseGuards(OptionalJwtAuthGuard)
  getCatalogById(@Param('id') id: string) {
    return this.servicesService.getCatalogServiceById(id)
  }

  // ─── My Services ──────────────────────────────────────────────────────────

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  getMine(@CurrentUser() user: any, @Query() dto: QueryServicesDto) {
    return this.servicesService.getMyServices(user.id, dto)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: any, @Body() dto: CreateServiceDto) {
    return this.servicesService.createService(user.id, dto)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateServiceDto) {
    return this.servicesService.updateService(id, user.id, dto)
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard)
  toggle(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.toggleStatus(id, user.id)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.servicesService.deleteService(id, user.id)
  }

  // ─── Categories (admin) ───────────────────────────────────────────────────

  @Get('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getCategories() {
    return this.servicesService.getCategories()
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  createCategory(@Body() dto: CreateServiceCategoryDto) {
    return this.servicesService.createCategory(dto)
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  updateCategory(@Param('id') id: string, @Body() dto: Partial<CreateServiceCategoryDto>) {
    return this.servicesService.updateCategory(id, dto)
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  deleteCategory(@Param('id') id: string) {
    return this.servicesService.deleteCategory(id)
  }
}
