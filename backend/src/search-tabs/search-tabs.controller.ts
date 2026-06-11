import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { SearchTabsService } from './search-tabs.service'
import { CreateSearchTabDto, UpdateSearchTabDto, ReorderSearchTabsDto } from './dto/search-tab.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'

@Controller('search-tabs')
export class SearchTabsController {
  constructor(private readonly service: SearchTabsService) {}

  // ─── Público: tabs habilitados para el hero de búsqueda ───────────────────
  @Get('public')
  findEnabled() {
    return this.service.findEnabled()
  }

  // ─── Admin: gestión completa ──────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('search_tabs:view')
  findAll() {
    return this.service.findAll()
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('search_tabs:view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('search_tabs:manage')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSearchTabDto) {
    return this.service.create(dto)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('search_tabs:manage')
  update(@Param('id') id: string, @Body() dto: UpdateSearchTabDto) {
    return this.service.update(id, dto)
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('search_tabs:manage')
  toggle(@Param('id') id: string) {
    return this.service.toggleEnabled(id)
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('search_tabs:manage')
  reorder(@Body() dto: ReorderSearchTabsDto) {
    return this.service.reorder(dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('search_tabs:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
