import {
  Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, UseGuards
} from '@nestjs/common'
import { OrdersService } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderDto } from './dto/update-order.dto'
import { QueryOrdersDto } from './dto/query-orders.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { OrderStatus } from '@prisma/client'

class PatchStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus

  @IsOptional()
  @IsString()
  cancelReason?: string
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('stats')
  @RequirePermission('orders:view')
  getStats(@CurrentUser() user: any) {
    return this.ordersService.getStats(user.commerceId)
  }

  @Get()
  @RequirePermission('orders:view')
  findAll(@CurrentUser() user: any, @Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(user.commerceId, query)
  }

  @Get(':id')
  @RequirePermission('orders:view')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.findOne(id, user.commerceId)
  }

  @Post()
  @RequirePermission('orders:create')
  create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.commerceId, dto)
  }

  @Put(':id')
  @RequirePermission('orders:edit')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, user.commerceId, dto)
  }

  @Patch(':id/status')
  @RequirePermission('orders:change_status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: PatchStatusDto,
  ) {
    return this.ordersService.updateStatus(id, user.commerceId, dto.status, dto.cancelReason)
  }

  @Delete(':id')
  @RequirePermission('orders:delete')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.remove(id, user.commerceId)
  }
}
